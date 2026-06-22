import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module";

describe("AppModule Imports Order Verification", () => {
  it("should enforce the safe change strategy of preserving existing import ordering", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as any[];
    expect(imports).toBeDefined();

    // Map modules to their string representations/constructor names
    const moduleNames = imports.map((item) => {
      if (!item) return "";
      if (typeof item === "function") {
        return item.name;
      }
      if (item.module && typeof item.module === "function") {
        return item.module.name;
      }
      return "";
    });

    const expectedOrderedPrefix = [
      "AppConfigModule",
      "ScheduleModule",
      "AuthModule",
      "UserModule",
      "PrismaModule",
      "MailModule",
      "WorkspaceModule",
      "ProjectModule",
      "ColumnModule",
      "IssueModule",
      "SprintModule",
      "CommentModule",
      "MeetingModule",
      "WorkspaceMemberModule",
      "ChatModule",
      "ChannelModule",
      "ChannelMemberModule",
      "UploadModule",
      "ProvidersModule",
      "NotificationsModule",
      "HealthModule",
    ];

    // Assert that the imports list begins with the exact prefix and order
    expectedOrderedPrefix.forEach((expectedName, index) => {
      expect(moduleNames[index]).toBe(expectedName);
    });
  });
});
