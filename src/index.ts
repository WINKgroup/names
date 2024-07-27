import fs from 'fs';
import axios from 'axios';
import _ from 'lodash';
import os from 'os';
import Path from 'path';

export interface GetRandomWordsOptions {
    minLength: number;
    fileUrl: string;
    destinationFullPath: string;
    keepFileForFutureUses: boolean;
}

function countFileLines(fullPath: string) {
    return new Promise<number>((resolve, reject) => {
        let count = 1;

        fs.createReadStream(fullPath)
            .on('data', (chunk) => {
                for (let i = 0; i < chunk.length; ++i)
                    if (chunk[i] == 10) count++;
            })
            .on('error', reject)
            .on('end', () => resolve(count));
    });
}

function getNthLine(fullPath: string, lineNum: number) {
    return new Promise<string>((resolve, reject) => {
        let count = 1;
        let word = '';
        let done = false;

        fs.createReadStream(fullPath, 'utf-8')
            .on('data', (chunk) => {
                for (let i = 0; i < chunk.length; ++i) {
                    if (chunk[i] == '\n') {
                        count++;
                        continue;
                    }
                    if (count === lineNum) word += chunk[i];
                    if (count > lineNum) {
                        done = true;
                        resolve(word);
                        return;
                    }
                }
            })
            .on('error', reject)
            .on('end', () => {
                if (!done) resolve(word);
            });
    });
}

async function downloader(url: string, fullPath: string) {
    const writer = fs.createWriteStream(fullPath);

    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

export async function getRandomWord(
    inputOptions?: Partial<GetRandomWordsOptions>,
) {
    const options: GetRandomWordsOptions = _.defaults(inputOptions, {
        minLength: 3,
        fileUrl: 'https://www.eecis.udel.edu/~lliao/cis320f05/dictionary.txt',
        destinationFullPath: Path.join(os.tmpdir(), 'names.txt'),
        keepFileForFutureUses: false,
    });
    if (!fs.existsSync(options.destinationFullPath))
        await downloader(options.fileUrl, options.destinationFullPath);

    const totalWords = await countFileLines(options.destinationFullPath);
    let result = '';

    for (let attempts = 0; attempts < 100; attempts++) {
        const n = 1 + Math.floor(Math.random() * totalWords);
        const word = await getNthLine(options.destinationFullPath, n);
        if (word.length >= options.minLength) {
            result = word;
            break;
        }
    }

    if (!options.keepFileForFutureUses)
        fs.unlinkSync(options.destinationFullPath);
    return result;
}
