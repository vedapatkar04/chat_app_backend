import mongoose, { Schema, Types } from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("DB connection failed", error);
    process.exit(1);
  }
};

class M {
  static mongify(id: string) {
     return new Schema.Types.ObjectId(id);
  }
}

const mongooseInstance = new M();
export { mongooseInstance as mongoose, M, Types };