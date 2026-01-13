import { Schema, model } from "mongoose";

enum EChatType {
  group = 1,
  personal = 2,
}

interface IConvo {
  channelId: Schema.Types.ObjectId;
  chatType: EChatType;
  users: string[];
  message: Schema.Types.ObjectId[];
}

interface IConvoType extends IConvo {
  _id: Schema.Types.ObjectId;
  dCreatedAt?: Date;
  dUpdatedAt?: Date;
}

const schema = new Schema<IConvoType>(
  {
    channelId: { type: Schema.Types.ObjectId, required: false },
    chatType: {
      type: Number,
      required: true,
      enum: EChatType,
      default: EChatType.personal,
    },
    users: { type: [String], default: [] },
    message: [
      {
        type: Schema.Types.ObjectId,
        required: false,
      },
    ],
  },
  {
    timestamps: { createdAt: "dCreatedAt", updatedAt: "dUpdatedAt" },
  }
);

const Conversation = model<IConvoType>("Conversation", schema, "Conversation");

export { Conversation, IConvo, IConvoType };
