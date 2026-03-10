import { Project, User } from "generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
      currentProject?: Project
      issueId?: string; 
    }
  }
}