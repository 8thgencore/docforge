import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { useSettings } from "@/features/settings/settings-context";
import { storageKeys } from "@/shared/config/storage";
import { useI18n } from "@/shared/i18n/use-i18n";

const schema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  language: z.enum(["ru", "en"]),
  theme: z.enum(["light", "dark", "system"]),
});

type FormValues = z.infer<typeof schema>;

export const SettingsPage = () => {
  const { baseUrl, apiKey, language, setApiKey, setBaseUrl, setLanguage } = useSettings();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      baseUrl,
      apiKey,
      language,
      theme: (theme as FormValues["theme"]) ?? "system",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setBaseUrl(values.baseUrl);
    setApiKey(values.apiKey);
    setLanguage(values.language);
    setTheme(values.theme);
    window.localStorage.setItem(storageKeys.theme, values.theme);
    toast.success(t("settings.saved"));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="base-url">{t("settings.baseUrl")}</Label>
            <Input id="base-url" placeholder="http://localhost:8300/v1" {...form.register("baseUrl")} />
            {form.formState.errors.baseUrl && (
              <p className="text-destructive text-xs">{form.formState.errors.baseUrl.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api-key">{t("settings.apiKey")}</Label>
            <Input id="api-key" type="password" placeholder="Enter API key" {...form.register("apiKey")} />
            {form.formState.errors.apiKey && (
              <p className="text-destructive text-xs">{form.formState.errors.apiKey.message}</p>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="language">{t("settings.language")}</Label>
              <Select id="language" {...form.register("language")}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="theme">{t("settings.theme")}</Label>
              <Select id="theme" {...form.register("theme")}>
                <option value="light">{t("settings.light")}</option>
                <option value="dark">{t("settings.dark")}</option>
                <option value="system">{t("settings.system")}</option>
              </Select>
            </div>
          </div>

          <div>
            <Button type="submit">{t("settings.save")}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
