import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import React from "react";
import styled from "styled-components/native";

const TabBarContainer = styled.View<{ height: number; rounding: boolean }>`
  width: 100%;
  background-color: white;
  padding: 0px 20px;
  flex-direction: row;
  align-items: center;
  border-bottom-width: 1px;
  border-bottom-color: rgba(0, 0, 0, 0.2);
  border-top-left-radius: ${(props) => (props.rounding ? 80 : 0)}px;
  border-top-right-radius: ${(props) => (props.rounding ? 80 : 0)}px;
`;

const TabButton = styled.TouchableOpacity<{ isFocused: boolean; height: number; focusColor?: string }>`
  flex: 1;
  height: ${(props) => props.height}px;
  justify-content: center;
  align-items: center;
  border-bottom-width: 2px;
  border-bottom-color: ${(props) => (props.isFocused ? props.focusColor ?? props.theme.primaryColor : "transparent")};
`;

const TextWrap = styled.View<{ height: number }>`
  height: ${(props) => props.height}px;
  justify-content: center;
`;

const TabText = styled.Text<{ isFocused: boolean }>`
  font-family: ${(props) => (props.isFocused ? props.theme.koreanFontM : props.theme.koreanFontR)};
  font-size: 15px;
  line-height: ${(props) => (props.isFocused ? 17 : 18)}px;
  color: ${(props) => (props.isFocused ? "black" : "#818181")};
`;

interface TabBarProps extends MaterialTopTabBarProps {
  height: number;
  rounding?: boolean;
  focusColor?: string;
}

const TabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation, height, rounding, focusColor }) => {
  return (
    <TabBarContainer height={height} rounding={rounding ?? false}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // The `merge: true` option makes sure that the params inside the tab screen are preserved
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <TabButton
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            height={height}
            isFocused={isFocused}
            focusColor={focusColor}
          >
            <TextWrap height={height}>
              <TabText isFocused={isFocused}>{label}</TabText>
            </TextWrap>
          </TabButton>
        );
      })}
    </TabBarContainer>
  );
};

export default TabBar;
