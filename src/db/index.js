// import mongoose from "mongoose";
// import { DB_NAME } from "../constants.js";

// const connectDB = async () => {
//   try {
//     const connectionInstance = await mongoose.connect(
//       `${process.env.MONGODB_URI}/${DB_NAME}`
//     );

//     console.log(
//       `\n MongoDB connected! DB Host: ${connectionInstance.connection.host}`
//     );
//   } catch (error) {
//     console.log("MongoDB Connection error!!", error);
//     process.exit(1);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const cleanedURI = process.env.MONGODB_URI.replace(/\/$/, ""); // removes trailing slash

    const connectionInstance = await mongoose.connect(
      `${cleanedURI}/${DB_NAME}`
    );

    console.log(
      `✅ MongoDB connected! Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("❌ MongoDB Connection error!", error);
    process.exit(1);
  }
};

export default connectDB;
