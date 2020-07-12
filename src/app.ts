import {Request, Response} from 'express'
import {json, urlencoded} from 'body-parser'
import webp from "webp-converter"
import mongoose from 'mongoose'
import request from 'request'
import fs from 'fs'
import AWS from 'aws-sdk'
import lodash from 'lodash'

import App from './server'

const aws = new AWS.S3({
    accessKeyId: "YOUR_ACCESS_KEY",
    secretAccessKey: "SECRET_ACCESS_KEY"
});

import {Game} from './model/game'


mongoose.connect("YOUR_MONGO_URI", {
      useNewUrlParser: !0,
		useUnifiedTopology: !0,
		useCreateIndex: true,
}).then(() => {
    console.log("connected to db")
})

const app: App = new App({
    port: 5454,
    middlewares: [
        json(),
        urlencoded({
            extended: true
        })
    ]
})

interface Resp {
    status: number;
    response: object;
}

const download = (
	uri: string,
	filename: string,
	callback: () => void
): void => {
		request.head(uri, () => {
			request(uri)
				.pipe(fs.createWriteStream(`${__dirname}/out/${filename}`))
				.on('close', callback)
				.on('error', (e) => console.log(e));
		});
};

app.methods.get('/', async (_req: Request, res: Response): Promise<void> => {
    console.log("ok");
    const baseUrl: string = "https://s3.game-linter.com/";
    const ext: string = ".webp";
    const extBack: string = "-back.webp";
    interface IGame extends Document{
        kebabTitle: string;
        thumbnail: string;
        backgroundimg: string;
    }
    const data: any[] = await Game.find({})
    for (let index = 0; index < data.length; index++) {
        const value = data[index];
        download(`${baseUrl}${value.kebabTitle}${ext}`, value.kebabTitle + ext, () => {
            console.log("Downloaded ", (index + 1) + "/" + data.length);
        })
        download(`${baseUrl}${value.kebabTitle}${extBack}`, value.kebabTitle + extBack, () => {
            console.log("Downloaded background ", (index + 1) + "/" + data.length);
        })
        webp.dwebp(__dirname + "/out/" + value.kebabTitle + ext, __dirname + "/conv/" + value.kebabTitle + ".jpeg", "-o").then(async (resp: any) => {
            console.log(resp);
            // uploading to aws s3
            const body: Buffer = fs.readFileSync(__dirname + "/conv/" + value.kebabTitle + ".jpeg");
            aws.upload({
                Bucket: "s3.game-linter.com",
                Key: value.kebabTitle + ".jpeg",
                ACL: "public-read",
                Body: body,
                CacheControl: "max-age=2592000"
            }, async (_err: any, data: AWS.S3.ManagedUpload.SendData): Promise<void> => {
                value.WebpThumb = value.thumbnail;
                value.thumbnail = data.Location;
                console.log("uploaded " + (index + 1));
                await value.save();
            } )
        });
        webp.dwebp(__dirname + "/out/" + value.kebabTitle + extBack, __dirname + "/conv/" + value.kebabTitle + "-back.jpeg", "-o").then(async (resp: any) => {
            console.log(resp);
            // uploading to aws s3
            const body: Buffer = fs.readFileSync(__dirname + "/conv/" + value.kebabTitle + "-back.jpeg");
            aws.upload({
                Bucket: "s3.game-linter.com",
                Key: value.kebabTitle + "-back.jpeg",
                ACL: "public-read",
                Body: body,
                CacheControl: "max-age=2592000"
            }, async (_err: any, data: AWS.S3.ManagedUpload.SendData): Promise<void> => {
                value.WebpBack = value.backgroundimg;
                value.backgroundimg = data.Location;
                console.log("uploaded " + (index + 1));
                await value.save();
            } )
        });
    }
    res.json(data);
})