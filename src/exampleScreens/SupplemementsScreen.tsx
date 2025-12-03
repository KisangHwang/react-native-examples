// Example bottom tab page for managing supplements in a health app.
// Shows loading state, derived "unscheduled" items, and navigation to edit/order flows.

import React, { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { SafeAreaComponent } from "../../../globalComponents/SafeAreaComponent";
import { SupplementsnHeader } from "./supplementsComponents/supplementsHeader/SupplementsHeader";
import { SupplementCardMain } from "./supplementsComponents/supplementCardMain/SupplementCardMain";

import { useAppTheme } from "../../../theme/colors/GlobalColors";
import { useResponsive } from "../../../globalUtilities/scailing";

import { RootNavProps } from "../../../navigateType";
import { SupplementType } from "./supplementType";

import { listSupplements } from "../../addSupplement/data/fileSystem/supplementsRepo";
import { fontStyles } from "../../../theme/fonts/GlobalFonts";
import { BottomTabNavProps } from "../tabType";
import { listReminders } from "../../addReminder/data/fileSystem/remindersRepo";

const Supplements = () => {
    const { colors } = useAppTheme();
    const { moderateScale } = useResponsive();
    const rootNavigation = useNavigation<RootNavProps<"BottomTabs">>();
    const tabNav = useNavigation<BottomTabNavProps<"Supplements">>();

    const [supplements, setSupplements] = useState<SupplementType[]>([]);

    const [unscheduledSupplements, setUnscheduledSupplements] = useState<
        SupplementType[]
    >([]);
    const [loading, setLoading] = useState(true);

    // Compute supplements that are not included in any reminder
    function computeUnscheduled(
        supps: SupplementType[],
        reminders: { selectedSupplements?: number[] }[],
    ): SupplementType[] {
        const inAnyReminder = new Set<number>();
        for (const r of reminders) {
            for (const id of r.selectedSupplements ?? []) inAnyReminder.add(id);
        }
        return supps.filter((s) => !inAnyReminder.has(s.id));
    }

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const [supps, rems] = await Promise.all([
                listSupplements(),
                listReminders(),
            ]);
            setSupplements(supps);
            setUnscheduledSupplements(computeUnscheduled(supps, rems));
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh whenever this tab/screen is focused (e.g., after saving a new item)
    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh]),
    );

    // Optimistic remove after a delete
    const handleDeleted = useCallback(
        (id: number) => {
            setSupplements((prev) => prev.filter((s) => s.id !== id));
        },
        [],
    );

    const handleEdit = useCallback(
        (id: number) => {
            const item = supplements.filter((value) => value.id === id)[0];
            if (!item) return; // guard in case the list changed
            rootNavigation.navigate("AddSupplement", {
                from: "supplements",
                action: "edit",
                data: item,
            });
        },
        [supplements, rootNavigation],
    );

    return (
        <SafeAreaComponent
            backgroundColor={colors.subBackground}
            style={[
                {
                    flex: 1,
                    paddingHorizontal: moderateScale(15),
                    gap: 15,
                },
            ]}
        >
            <SupplementsnHeader
                onClickAdd={() => {
                    rootNavigation.navigate("AddSupplement", {
                        from: "supplements",
                        action: "edit",
                    });
                }}
            />

            {loading ? (
                <ActivityIndicator
                    color={colors.text}
                    style={{ marginTop: 16 }}
                />
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        gap: 10,
                        paddingBottom: 30,
                    }}
                >
                    {supplements.length === 0 ? (
                        <Text
                            style={[
                                fontStyles.sub,
                                { color: colors.text, alignSelf: "center" },
                            ]}
                        >
                            No supplements yet.
                        </Text>
                    ) : (
                        supplements.map((value, index) => (
                            <SupplementCardMain
                                key={value.id ?? index}
                                supplementData={value}
                                onClickOrder={(id) => {
                                    tabNav.navigate("CommerceNavigationStack", {
                                        screen: "ProductDetail",
                                        params: { productId: id },
                                    });
                                }}
                                onDeleted={handleDeleted}
                                onEdit={handleEdit}
                                unscheduled={unscheduledSupplements.some(
                                    (item) => item.id === value.id,
                                )}
                                onClickNotIn={() => {
                                    rootNavigation.navigate("AddSupplement", {
                                        action: "notin",
                                        data: value,
                                        from: "supplements",
                                    });
                                }}
                            />
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaComponent>
    );
};

export default Supplements;
