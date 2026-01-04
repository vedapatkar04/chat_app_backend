import mongoose, { Schema, set, Types } from "mongoose";

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
  static id = Schema.Types.ObjectId;
  static mongify(id: string) {
    console.log(id)
    return new Types.ObjectId(id);
  }
}

const mongooseInstance = new M();
export { mongooseInstance as mongoose, M, Types };