import { Composer } from 'telegraf';
import fetch from 'node-fetch';
import { connections, queue } from '../tgcalls';
import { ffmpeg } from '../ffmpeg';
import { escape } from 'html-escaper';
import { DeezerResponse } from '../types/responseTypes';
import { commandExtractor, sendPlayingMessage } from '../utils';

export const Deezer = Composer.command('deezer', async (ctx) => {

    let { args: keyword } = commandExtractor(ctx.message.text)
    if (!keyword) return await ctx.reply("Die You Retard")

    await ctx.replyWithChatAction("typing");

    let resp: DeezerResponse[] = await (await fetch(`https://jostapi-production.up.railway.app/deezer?query=${keyword.replace(/\s/g, '%20')}&quality=mp3&limit=1`)).json()
    if (!resp || resp.length === 0) return await ctx.reply("No Results Found");

    let [result] = resp;
    let FFMPEG = ffmpeg(result.raw_link)
    if (!FFMPEG) return await ctx.reply("Something went wrong with FFMPEG")

    if (connections.playing(ctx.chat.id)) {
        const position = queue.add(ctx.chat.id, {
            link: result.link,
            title: result.title,
            image: result.album.cover_big,
            artist: result.artist.name,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            },
            readable: FFMPEG
        })
        return await ctx.replyWithHTML(`<a href="${result.link}">${result.title}</a> Queued at Postion ${position} by <a href="tg://user?id=${ctx.from.id}">${escape(ctx.from.first_name)}</a>`)
    } else {
        await connections.setReadable(ctx.chat.id, FFMPEG);
        return await sendPlayingMessage(ctx.chat.id, {
            link: result.link,
            title: result.title,
            image: result.album.cover_big,
            artist: result.artist.name,
            requestedBy: {
                id: ctx.from.id,
                first_name: ctx.from.first_name
            }
        })
    }
})