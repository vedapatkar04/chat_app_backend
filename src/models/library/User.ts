import { Schema, model } from "mongoose";

interface IUser {
    userName: string;
    email: string;
    password: string
    name?: string;
    authToken: string
    socketId: string;
    isOnline: boolean;
    lastSeen: Date;
    lastSeenChatId?: Schema.Types.ObjectId;
}

interface IUserType extends IUser {
  _id: Schema.Types.ObjectId;
  dCreatedAt: Date;
  dUpdatedAt: Date;
}

const schema = new Schema<IUserType>(
  {
    userName: { type: String, index: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: false, default: '' },
    authToken: { type: String, required: false, default: '' },
    socketId: { type: String, required: false, default: '' },
    isOnline: { type: Boolean, required: false, default: true },
    lastSeen: { type: Date, required: false, default: new Date() },
    lastSeenChatId: { type: Schema.Types.ObjectId, required: false },
    },
  {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
  }
);

schema.index({ email: 1 });

const User = model<IUserType>('User', schema, 'User');

export { User, IUser, IUserType };
