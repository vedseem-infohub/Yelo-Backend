/**
 * Script to fix the phone index in the users collection
 * Run this once to fix the duplicate key error for null phone values
 * 
 * Usage: node src/scripts/fix-phone-index.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../modules/user/user.model");

async function fixPhoneIndex() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error("MONGODB_URI or MONGO_URI environment variable is required");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    // Drop the existing phone index
    try {
      console.log("Dropping existing phone index...");
      await collection.dropIndex("phone_1");
      console.log("✓ Dropped existing phone index");
    } catch (err) {
      if (err.code === 27) {
        console.log("Index doesn't exist, skipping drop");
      } else {
        throw err;
      }
    }

    // Create a new sparse unique index on phone
    console.log("Creating new sparse unique index on phone...");
    await collection.createIndex(
      { phone: 1 },
      { 
        unique: true, 
        sparse: true,
        name: "phone_1"
      }
    );
    console.log("✓ Created new sparse unique index on phone");

    console.log("\n✅ Index fix completed successfully!");
    console.log("You can now create users without phone numbers without duplicate key errors.");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing index:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixPhoneIndex();
