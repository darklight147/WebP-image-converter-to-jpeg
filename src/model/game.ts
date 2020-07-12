import mongoose, {Document, Schema, Model } from 'mongoose';


const gameSchema: Schema = new Schema({
		kebabTitle: String,
		thumbnail: String,
		backgroundimg: String,
        WebpThumb: String,
        WebpBack: String
})

export const Game: Model<Document, {}> = mongoose.model("Game", gameSchema);