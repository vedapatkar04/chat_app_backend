import { Schema, model } from 'mongoose';

enum EChatType {
  group = 1,
  personal = 2,
}

enum EMessageStatus {
  sent = 1,
  delivered = 2,
  read = 3,
}

interface IMessage {
  senderId: Schema.Types.ObjectId;
  receiverId?: Schema.Types.ObjectId;
  channelId?: Schema.Types.ObjectId;
  chatType: EChatType;
  message: string | null;
  status: EMessageStatus;
  readBy?: string[]
}

interface IMessageType extends IMessage {
  _id: Schema.Types.ObjectId;
  dCreatedAt?: Date;
  dUpdatedAt?: Date;
}

const schema = new Schema<IMessageType>(
  {
    senderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    receiverId: { type: Schema.Types.ObjectId, required: false, ref: 'User'  },
    channelId: { type: Schema.Types.ObjectId, required: false },
    chatType: { type: Number, required: true, enum: EChatType, default: EChatType.personal },
    message: { type: String || null, required: false, default: '' },
    status: { type: Number, required: true, enum: EMessageStatus, default: EMessageStatus.sent },
    readBy: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
  }
);

const Message = model<IMessageType>('Message', schema, 'Message');

export { Message, IMessage, IMessageType, EMessageStatus, EChatType };
