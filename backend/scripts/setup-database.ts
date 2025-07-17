import { Client, Databases, Storage, Permission, Role } from "https://deno.land/x/appwrite@9.0.0/mod.ts";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(Deno.env.get("APPWRITE_ENDPOINT") || "")
  .setProject(Deno.env.get("APPWRITE_PROJECT_ID") || "")
  .setKey(Deno.env.get("APPWRITE_API_KEY") || "");

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID") || "clouddrive";
const STORAGE_BUCKET_ID = Deno.env.get("APPWRITE_STORAGE_BUCKET_ID") || "files";

async function setupDatabase() {
  try {
    console.log("🚀 Setting up CloudDrive database...");

    // Create database
    try {
      await databases.create(DATABASE_ID, "CloudDrive Database");
      console.log("✅ Database created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️ Database already exists");
      } else {
        throw error;
      }
    }

    // Create Files collection
    try {
      await databases.createCollection(
        DATABASE_ID,
        "files",
        "Files",
        [
          Permission.create(Role.users()),
          Permission.read(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      console.log("✅ Files collection created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️ Files collection already exists");
      } else {
        throw error;
      }
    }

    // Create file attributes
    const fileAttributes = [
      { key: "name", type: "string", size: 255, required: true },
      { key: "originalName", type: "string", size: 255, required: true },
      { key: "size", type: "integer", required: true },
      { key: "mimeType", type: "string", size: 100, required: true },
      { key: "storageId", type: "string", size: 36, required: true },
      { key: "folderId", type: "string", size: 36, required: false },
      { key: "userId", type: "string", size: 36, required: true },
      { key: "path", type: "string", size: 500, required: true },
      { key: "isShared", type: "boolean", required: true, default: false },
      { key: "shareToken", type: "string", size: 64, required: false },
      { key: "shareExpiry", type: "datetime", required: false },
      { key: "tags", type: "string", size: 1000, required: false, array: true }
    ];

    for (const attr of fileAttributes) {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            DATABASE_ID,
            "files",
            attr.key,
            attr.size!,
            attr.required,
            attr.default,
            attr.array
          );
        } else if (attr.type === "integer") {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            "files",
            attr.key,
            attr.required,
            undefined,
            undefined,
            attr.default
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            "files",
            attr.key,
            attr.required,
            attr.default
          );
        } else if (attr.type === "datetime") {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            "files",
            attr.key,
            attr.required,
            attr.default
          );
        }
        console.log(`✅ File attribute '${attr.key}' created`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`ℹ️ File attribute '${attr.key}' already exists`);
        } else {
          console.error(`❌ Error creating file attribute '${attr.key}':`, error.message);
        }
      }
    }

    // Create Folders collection
    try {
      await databases.createCollection(
        DATABASE_ID,
        "folders",
        "Folders",
        [
          Permission.create(Role.users()),
          Permission.read(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      console.log("✅ Folders collection created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️ Folders collection already exists");
      } else {
        throw error;
      }
    }

    // Create folder attributes
    const folderAttributes = [
      { key: "name", type: "string", size: 255, required: true },
      { key: "parentId", type: "string", size: 36, required: false },
      { key: "userId", type: "string", size: 36, required: true },
      { key: "path", type: "string", size: 500, required: true },
      { key: "isShared", type: "boolean", required: true, default: false },
      { key: "shareToken", type: "string", size: 64, required: false },
      { key: "shareExpiry", type: "datetime", required: false }
    ];

    for (const attr of folderAttributes) {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            DATABASE_ID,
            "folders",
            attr.key,
            attr.size!,
            attr.required,
            attr.default
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            "folders",
            attr.key,
            attr.required,
            attr.default
          );
        } else if (attr.type === "datetime") {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            "folders",
            attr.key,
            attr.required,
            attr.default
          );
        }
        console.log(`✅ Folder attribute '${attr.key}' created`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`ℹ️ Folder attribute '${attr.key}' already exists`);
        } else {
          console.error(`❌ Error creating folder attribute '${attr.key}':`, error.message);
        }
      }
    }

    // Create Activities collection
    try {
      await databases.createCollection(
        DATABASE_ID,
        "activities",
        "Activities",
        [
          Permission.create(Role.users()),
          Permission.read(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      console.log("✅ Activities collection created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️ Activities collection already exists");
      } else {
        throw error;
      }
    }

    // Create activity attributes
    const activityAttributes = [
      { key: "userId", type: "string", size: 36, required: true },
      { key: "action", type: "string", size: 50, required: true },
      { key: "targetId", type: "string", size: 36, required: true },
      { key: "targetName", type: "string", size: 255, required: true },
      { key: "targetType", type: "string", size: 20, required: true },
      { key: "details", type: "string", size: 500, required: false },
      { key: "ipAddress", type: "string", size: 45, required: false },
      { key: "userAgent", type: "string", size: 500, required: false }
    ];

    for (const attr of activityAttributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          "activities",
          attr.key,
          attr.size,
          attr.required
        );
        console.log(`✅ Activity attribute '${attr.key}' created`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`ℹ️ Activity attribute '${attr.key}' already exists`);
        } else {
          console.error(`❌ Error creating activity attribute '${attr.key}':`, error.message);
        }
      }
    }

    // Create Shares collection
    try {
      await databases.createCollection(
        DATABASE_ID,
        "shares",
        "Shares",
        [
          Permission.create(Role.users()),
          Permission.read(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ]
      );
      console.log("✅ Shares collection created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️ Shares collection already exists");
      } else {
        throw error;
      }
    }

    // Create share attributes
    const shareAttributes = [
      { key: "resourceId", type: "string", size: 36, required: true },
      { key: "resourceType", type: "string", size: 20, required: true },
      { key: "ownerId", type: "string", size: 36, required: true },
      { key: "sharedWithUserId", type: "string", size: 36, required: false },
      { key: "sharedWithEmail", type: "string", size: 255, required: false },
      { key: "permissions", type: "string", size: 500, required: true, array: true },
      { key: "token", type: "string", size: 64, required: true },
      { key: "expiresAt", type: "datetime", required: false },
      { key: "isPublic", type: "boolean", required: true, default: true }
    ];

    for (const attr of shareAttributes) {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            DATABASE_ID,
            "shares",
            attr.key,
            attr.size!,
            attr.required,
            attr.default,
            attr.array
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            "shares",
            attr.key,
            attr.required,
            attr.default
          );
        } else if (attr.type === "datetime") {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            "shares",
            attr.key,
            attr.required,
            attr.default
          );
        }
        console.log(`✅ Share attribute '${attr.key}' created`);
      } catch (error) {
        if (error.message.includes("already exists")) {
          console.log(`ℹ️ Share attribute '${attr.key}' already exists`);
        } else {
          console.error(`❌ Error creating share attribute '${attr.key}':`, error.message);
        }
      }
    }

    // Create storage bucket
    try {
      await storage.createBucket(
        STORAGE_BUCKET_ID,
        "Files Bucket",
        [
          Permission.create(Role.users()),
          Permission.read(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users())
        ],
        false, // fileSecurity
        true,  // enabled
        100 * 1024 * 1024, // maxFileSize (100MB)
        ["*"], // allowedFileExtensions
        "gzip", // compression
        false, // encryption
        false  // antivirus
      );
      console.log("✅ Storage bucket created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️ Storage bucket already exists");
      } else {
        throw error;
      }
    }

    console.log("🎉 Database setup completed successfully!");
    
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    Deno.exit(1);
  }
}

// Run setup
if (import.meta.main) {
  await setupDatabase();
}