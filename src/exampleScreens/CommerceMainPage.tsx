// Example main commerce page for a React Native app.
// Shows banner carousel, categories, multiple product showcases,
// deferred rendering for smoother UX, and deep-link-like scrolling.

import React, {
    useMemo,
    useCallback,
    useEffect,
    useState,
    useRef,
} from "react";
import { View, InteractionManager } from "react-native";
import {
    useFocusEffect,
    useNavigation,
    useRoute,
} from "@react-navigation/native";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";

import {
    CommerceHeaderPage,
    commercePaddingHorizontal,
} from "../commerceComponents/CommerceHeaderPage";
import { BannerCarousel } from "../commerceComponents/bannerCarousel/BannerCarousel";
import { BannerCarouselSkeleton } from "../commerceComponents/bannerCarousel/skeleton/BannerCarouselSkeleton";
import { CategoryGrid } from "./mainPageComponents/categories/CategoryGrid";
import { CategoryGridSkeleton } from "./mainPageComponents/categories/skeletons/CategoryGridSkeleton";
import { ShowcaseByTag } from "../commerceComponents/showCase/ShowcaseByTag";
import { TimedShowcaseByTag } from "../commerceComponents/showCase/TimedShowcaseByTag";

import { useResponsive } from "../../../../globalUtilities/scailing";
import { useStoreCategories } from "../woocommerceApi/mainPage/hook/useStoreCategories";
import { useTimeDealEndsAt } from "../amplify/mainPage/hook/useTimeDealEndsAt";
import { useAdUrls } from "../amplify/mainPage/hook/useAdUrls";
import {
    CommerceNavProps,
    CommerceRouteProps,
    CommerceStackParamList,
} from "../CommerceNavigateType";
import { UrlType } from "../amplify/mainPage/api/getAdUrls";
import { PromoTag } from "../shop/shopComponents/filterModal/FilterType";

export function safeParseParams(json?: string | null): any | undefined {
    if (!json) return undefined;
    try {
        const o = JSON.parse(json);
        return typeof o === "object" ? o : undefined;
    } catch {
        return undefined;
    }
}

const TAGS = [
    { title: "Best Sellers", slug: "best-sellers" },
    { title: "Limited-Time Deals", slug: "limited-time-deals" },
    { title: "Bundles for Your Goals", slug: "bundles-for-your-goals" },
    { title: "Top Rated by Customers", slug: "top-rated-by-customers" },
    { title: "This Month’s Picks", slug: "this-months-picks" },
    { title: "Just Arrived", slug: "just-arrived" },
] as const;

const SHOWCASE_ALIAS: Record<string, string> = {
    "limited-time deals": "limited-time-deals",
    "top rated products": "top-rated-by-customers",
    "top rated by customers": "top-rated-by-customers",
    "best sellers": "best-sellers",
    "bundles for your goals": "bundles-for-your-goals",
    "this months picks": "this-months-picks",
    "just arrived": "just-arrived",
};

const norm = (s: string) =>
    s
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const titleToSlug = (title: string): string | undefined => {
    const n = norm(title);
    if (SHOWCASE_ALIAS[n]) return SHOWCASE_ALIAS[n];
    const hit = TAGS.find((t) => norm(t.title) === n);
    return hit?.slug;
};

type Row =
    | { key: "banner"; type: "banner" }
    | { key: "categories"; type: "categories" }
    | {
          key: string;
          type: "showcase";
          title: string;
          slug: string;
          timed?: boolean;
      };

const defaultCategoryProps = {
    previewRows: 2,
    targetTileWidth: 80,
    gap: 10,
    minCols: 2,
    maxCols: 8,
};

const MainPage = () => {
    const route = useRoute<CommerceRouteProps<"MainPage">>();
    const navigation = useNavigation<CommerceNavProps<"MainPage">>();
    const { moderateScale } = useResponsive();

    const { categories, categoryLoading } = useStoreCategories();
    const { endAt, timeDealLoading } = useTimeDealEndsAt();
    const { urls, urlLoading } = useAdUrls();

    // Defer mounting lower sections for a snappier first paint
    const [deferred, setDeferred] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() =>
            setDeferred(true),
        );
        return () => task.cancel();
    }, []);

    const sections: Row[] = [
        { key: "banner", type: "banner" },
        { key: "categories", type: "categories" },
        ...TAGS.map((t) => ({
            key: `tag-${t.slug}` as const,
            type: "showcase" as const,
            title: t.title,
            slug: t.slug,
            timed: t.slug === "limited-time-deals",
        })),
    ];

    const onPressProduct = useCallback(
        (id: number) => navigation.navigate("ProductDetail", { productId: id }),
        [navigation],
    );

    type ShopParams = CommerceStackParamList["Shop"];
    const listRef = useRef<FlashListRef<Row>>(null);

    const indexBySlug = useMemo(() => {
        const map = new Map<string, number>();
        sections.forEach((row, i) => {
            if (row.type === "showcase") map.set(row.slug, i);
        });
        return map;
    }, [sections]);

    const scrollToShowcase = useCallback(
        (slug: string) => {
            const index = indexBySlug.get(slug);
            if (index == null) return;
            InteractionManager.runAfterInteractions(() => {
                listRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0,
                });
            });
        },
        [indexBySlug, moderateScale],
    );

    const scrollToShowcaseTitle = useCallback(
        (title: string) => {
            const slug = titleToSlug(title);
            if (slug) scrollToShowcase(slug);
        },
        [scrollToShowcase],
    );

    const onBannerPress = useCallback(
        (b: UrlType) => {
            switch (b.action) {
                case "nav": {
                    const target = (b.target ||
                        "") as keyof CommerceStackParamList;
                    const raw = safeParseParams(b.params) as
                        | Partial<ShopParams>
                        | undefined;

                    // Optional: validate promoTag
                    const promoTag = (raw?.promoTag ?? undefined) as
                        | PromoTag
                        | undefined;
                    const finalParams =
                        target === "Shop"
                            ? ({
                                  ...raw,
                                  ...(promoTag !== undefined
                                      ? { promoTag }
                                      : {}),
                              } as ShopParams)
                            : (raw as any);

                    if (target) navigation.navigate(target as any, finalParams);
                    break;
                }
                case "scroll":
                    // scroll the main list
                    listRef.current?.scrollToOffset({
                        offset: 999999,
                        animated: true,
                    });
                    break;

                default:
                    break;
            }
        },
        [navigation],
    );

    const renderItem = useCallback<ListRenderItem<Row>>(
        ({ item }) => {
            switch (item.type) {
                case "banner":
                    return urlLoading ? (
                        <BannerCarouselSkeleton />
                    ) : (
                        <BannerCarousel
                            urls={urls}
                            onPressItem={onBannerPress}
                        />
                    );
                case "categories":
                    return (
                        <View
                            style={{
                                paddingHorizontal: moderateScale(
                                    commercePaddingHorizontal,
                                ),
                            }}
                        >
                            {categoryLoading ? (
                                <CategoryGridSkeleton
                                    totalCount={11}
                                    previewRows={
                                        defaultCategoryProps.previewRows
                                    }
                                    targetTileWidth={
                                        defaultCategoryProps.targetTileWidth
                                    }
                                    gap={defaultCategoryProps.gap}
                                    minCols={defaultCategoryProps.minCols}
                                    maxCols={defaultCategoryProps.maxCols}
                                />
                            ) : (
                                <CategoryGrid
                                    categories={categories}
                                    onPressCategory={(c) =>
                                        navigation.navigate("Shop", {
                                            categoryId: c.id,
                                        })
                                    }
                                    previewRows={
                                        defaultCategoryProps.previewRows
                                    }
                                    targetTileWidth={
                                        defaultCategoryProps.targetTileWidth
                                    }
                                    gap={defaultCategoryProps.gap}
                                    minCols={defaultCategoryProps.minCols}
                                    maxCols={defaultCategoryProps.maxCols}
                                />
                            )}
                        </View>
                    );
                case "showcase": {
                    const isTimed = item.timed && !timeDealLoading;

                    return (
                        <View
                            style={{
                                paddingHorizontal: moderateScale(
                                    commercePaddingHorizontal,
                                ),
                            }}
                        >
                            {!deferred && item.slug !== "best-sellers" ? (
                                <View style={{ height: 1 }} />
                            ) : isTimed ? (
                                <TimedShowcaseByTag
                                    key={item.slug}
                                    title={item.title}
                                    tagSlug="limited-time-deals"
                                    endAt={endAt}
                                    onPressProduct={onPressProduct}
                                    hideWhenExpired
                                />
                            ) : (
                                <ShowcaseByTag
                                    key={item.slug}
                                    title={item.title}
                                    tagSlug={item.slug}
                                    onPressProduct={onPressProduct}
                                />
                            )}
                        </View>
                    );
                }
            }
        },
        [
            urlLoading,
            urls,
            categoryLoading,
            categories,
            navigation,
            endAt,
            timeDealLoading,
            deferred,
            moderateScale,
            onBannerPress,
            onPressProduct,
        ],
    );

    type MainPageParams = CommerceStackParamList["MainPage"];

    const done = !urlLoading && !categoryLoading && !timeDealLoading;

    useFocusEffect(
        useCallback(() => {
            if (!done) return; // wait until content is ready

            const title = route.params?.scrollTo?.trim();
            if (!title) return;

            // run after layout/animations so the list is measurable
            setTimeout(() => {
                InteractionManager.runAfterInteractions(() => {
                    scrollToShowcaseTitle(title);

                    // clear the param so it doesn't re-trigger next focus
                    navigation.setParams({
                        scrollTo: undefined,
                    } as Partial<MainPageParams>);
                });
            }, 100);
        }, [done, route.params?.scrollTo, scrollToShowcaseTitle, navigation]),
    );

    const getItemType = useCallback((row: Row) => row.type, []);
    const keyExtractor = useCallback((row: Row) => row.key, []);

    return (
        <CommerceHeaderPage>
            <FlashList<Row>
                ref={listRef}
                style={{ flex: 1 }}
                data={sections}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemType={getItemType}
                contentContainerStyle={{
                    paddingBottom: moderateScale(15),
                }}
                ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
                showsVerticalScrollIndicator={false}
            />
        </CommerceHeaderPage>
    );
};

export default MainPage;
