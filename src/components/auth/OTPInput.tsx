import React from "react";

import {
  StyleSheet,
  Text,
} from "react-native";

import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";

import colors from "@/theme/colors";

const CELL_COUNT = 6;

interface Props {
  value: string;
  onChange(value: string): void;
  editable?: boolean;
}

export default function OTPInput({
  value,
  onChange,
  editable = true,
}: Props) {
  const ref = useBlurOnFulfill({
    value,
    cellCount: CELL_COUNT,
  });

  const [props, getCellOnLayoutHandler] =
    useClearByFocusCell({
      value,
      setValue: onChange,
    });

  return (
    <CodeField
      ref={ref}
      {...props}
      value={value}
      onChangeText={onChange}
      cellCount={CELL_COUNT}
      editable={editable}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      rootStyle={styles.root}
      renderCell={({ index, symbol, isFocused }) => (
        <Text
          key={index}
          onLayout={getCellOnLayoutHandler(index)}
          style={[
            styles.cell,
            isFocused && styles.focus,
          ]}
        >
          {symbol || (isFocused ? <Cursor /> : null)}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    justifyContent: "space-between",
    marginVertical: 30,
  },

  cell: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center",
    lineHeight: 56,
    fontSize: 24,
    color: colors.navy,
  },

  focus: {
    borderColor: colors.primary,
  },
});