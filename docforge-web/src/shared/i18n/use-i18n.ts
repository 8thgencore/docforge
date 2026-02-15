import { useSettings } from "@/features/settings/settings-context";
import { messages } from "@/shared/i18n/messages";

export const useI18n = () => {
  const { language } = useSettings();

  const t = (key: string) => {
    return messages[language][key] ?? messages.en[key] ?? key;
  };

  return {
    language,
    t,
  };
};
