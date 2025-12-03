# react-native-examples
Example React Native screen from a production health &amp; wellness app.

# React Native Commerce & Supplements Screens (Example)

This repository contains two example screens from a real-world React Native
health & wellness / commerce app that I built:

1. `SupplementsScreen.tsx`  
   - A bottom-tab page that:
     - Loads supplements and reminders from storage
     - Derives "unscheduled" supplements by comparing two datasets
     - Shows loading / empty states
     - Navigates to edit and order flows

2. `CommerceMainPage.tsx`  
   - A main commerce/home page that:
     - Renders banners, categories, and several product showcases
     - Uses FlashList for performance
     - Defers some rendering with `InteractionManager` for smoother UX
     - Supports deep-link-like behavior via route params to scroll to sections
     - Handles banner actions (navigation vs scroll)

These files are meant to demonstrate my React Native coding style, state
management patterns, navigation usage, and how I structure real production
screens. Some imports reference components/hooks from the original app; they
are left as-is for clarity, even if the repo is not meant to be run directly.
