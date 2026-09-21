import { AudioTextButton } from "@/components/AudioTextButton";
import { audioSrcFor } from "@/lib/audio";

export function AudioText({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  return (
    <AudioTextButton
      text={text}
      src={audioSrcFor(text)}
      label={label ?? text}
    />
  );
}
