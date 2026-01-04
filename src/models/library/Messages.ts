import { Schema, model } from 'mongoose';

enum EChatType {
  group = 1,
  personal = 2,
}

enum EStatus {
  sent = 1,
  delivered = 2,
  read = 3,
}

interface IMessage {
  senderId: Schema.Types.ObjectId;
  chatType: EChatType;
  message: string | null;
  status: EStatus;
  readBy?: string[]
}

interface IMessageType extends IMessage {
  _id: Schema.Types.ObjectId;
  dCreatedAt?: Date;
  dUpdatedAt?: Date;
}

const schema = new Schema<IMessageType>(
  {
    senderId: { type: Schema.Types.ObjectId, required: true, index: true },
    chatType: { type: Number, required: true, enum: EChatType, default: EChatType.personal },
    message: { type: String || null, required: false, default: '' },
    status: { type: Number, required: true, enum: EStatus, default: EStatus.sent },
    readBy: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
  }
);

const Message = model<IMessageType>('Message', schema, 'Message');

export { Message, IMessage, IMessageType };
