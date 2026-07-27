import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";

import CountryPicker, {
  Country,
} from "react-native-country-picker-modal";

import colors from "@/theme/colors";

interface Props {
  value: string;
  onChange(value: string): void;
}

export default function PhoneInput({
  value,
  onChange,
}: Props) {
  const [countryCode, setCountryCode] = React.useState("IN");
  const [callingCode, setCallingCode] = React.useState("91");

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.country}>
        <CountryPicker
          withFlag
          withCallingCode
          withFilter
          countryCode={countryCode}
          onSelect={onSelect}
        />

        <Text style={styles.code}>
          +{callingCode}
        </Text>
      </View>

      <TextInput
        placeholder="Mobile Number"
        keyboardType="number-pad"
        value={value}
        maxLength={10}
        onChangeText={(text) =>
          onChange(text.replace(/\D/g, ""))
        }
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",

    borderRadius: 18,

    backgroundColor: "white",

    borderWidth: 1,

    borderColor: colors.border,

    overflow: "hidden",

    height: 60,
  },

  country: {
    width: 115,

    justifyContent: "center",

    alignItems: "center",

    flexDirection: "row",

    borderRightWidth: 1,

    borderRightColor: colors.border,
  },

  code: {
    marginLeft: 5,

    fontWeight: "600",

    color: colors.navy,

    fontSize: 16,
  },

  input: {
    flex: 1,

    paddingHorizontal: 18,

    fontSize: 18,

    color: colors.navy,
  },
});