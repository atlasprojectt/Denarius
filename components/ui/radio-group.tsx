"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

function RadioGroup<Value>(props: RadioGroupPrimitive.Props<Value>) {
  return <RadioGroupPrimitive {...props} />;
}

function RadioGroupItem<Value>(props: Radio.Root.Props<Value>) {
  return (
    <Radio.Root
      nativeButton
      render={<button type="button" />}
      {...props}
    />
  );
}

function RadioGroupIndicator(props: Radio.Indicator.Props) {
  return <Radio.Indicator {...props} />;
}

export { RadioGroup, RadioGroupIndicator, RadioGroupItem };
