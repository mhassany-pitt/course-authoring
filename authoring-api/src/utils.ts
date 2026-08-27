import { ConfigService } from "@nestjs/config";
import mongoose from "mongoose";

export const storageRoot = (config: ConfigService, ...path: string[]) => {
  return config.get('STORAGE_PATH') + (path ? '/' + path.join('/') : '');
}

export const toObject = (object) => object?.toObject();
export const useId = (object): any => {
  if (object) {
    const { __v, _id: id, ...attrs } = object;
    return ({ ...attrs, id: id.toString() })
  } else return null;
};
export const use_Id = (object): any => {
  if (object) {
    const { id: _id, ...attrs } = object;
    return ({ ...attrs, _id: new mongoose.Types.ObjectId(_id) });
  } else return null;
}