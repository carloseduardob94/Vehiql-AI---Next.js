import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";
import type { User } from "@prisma/client";

export const checkUser = async (): Promise<User | null> => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        imageUrl: user.imageUrl,
        email: user.emailAddresses?.[0]?.emailAddress ?? "",
      },
    });

    return newUser;
  } catch (error) {
    console.error("checkUser error:", error);
    return null;
  }
};
