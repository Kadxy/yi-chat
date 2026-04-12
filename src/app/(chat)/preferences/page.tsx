"use client";

import { UserInstructionsContent } from "@/components/chat-preferences-content";

export default function PreferencesPage() {
  return (
    <div className="flex justify-center h-full p-4 md:p-6">
      <div className="w-full lg:w-5xl">
        <div className="rounded-lg border p-4 md:p-8">
          <UserInstructionsContent />
        </div>
      </div>
    </div>
  );
}
