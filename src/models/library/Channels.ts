import { Schema, model } from 'mongoose';

enum EStatus {
  active = 1,
  deactivated = 2,
}

interface IChannel {
  channelName: string;
  users: {
    userId: Schema.Types.ObjectId,
    userName: string,
  }[];
  status: EStatus;
}

interface IChannelType extends IChannel {
  _id: Schema.Types.ObjectId;
  dCreatedAt?: Date;
  dUpdatedAt?: Date;
}

const schema = new Schema<IChannelType>(
  {
    channelName: { type: String, required: true, index: true },
    users: { type: [
        {
          _id: false,
          userId: { type: Schema.Types.ObjectId, required: true, index: true },
          userName: { type: String, default: '' },
        },
      ],
      required: true,
      default: []
    },
    status: { type: Number, required: true, enum: EStatus, default: EStatus.active },
  },
  {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
  }
);

const Channel = model<IChannelType>('Channel', schema, 'Channel');

export { Channel, IChannel, IChannelType };
