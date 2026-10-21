import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function EmptyState({ illustration: Illustration, title, subtitle, action }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-10 gap-5">
      {Illustration && typeof Illustration === 'function' ? (
        <Illustration width={200} height={200} />
      ) : Illustration ? (
        Illustration
      ) : null}
      <View className="items-center gap-1.5 max-w-xs">
        <Text className="text-lg font-bold text-slate-800 text-center">{title}</Text>
        {subtitle ? (
          <Text className="text-sm text-slate-400 text-center leading-5">{subtitle}</Text>
        ) : null}
      </View>
      {action && (
        <TouchableOpacity
          onPress={action.onPress || action.onClick}
          className="bg-blue-600 px-6 py-3 rounded-xl mt-2 w-full max-w-xs active:opacity-90"
        >
          <Text className="text-white font-semibold text-center text-sm">{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default EmptyState;
