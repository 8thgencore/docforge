import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ChatPage } from "@/pages/ChatPage";
import { DraftPage } from "@/pages/DraftPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { IngestionPage } from "@/pages/IngestionPage";
import { SearchPage } from "@/pages/SearchPage";
import { SettingsPage } from "@/pages/SettingsPage";

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout contentMode="constrained" />}>
          <Route index element={<Navigate replace to="/groups" />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/ingestion" element={<IngestionPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/draft" element={<DraftPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route element={<AppLayout contentMode="full-bleed" />}>
          <Route path="/chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
