import {
    describe,
    test,
    expect,
    jest
} from '@jest/globals'
import fs from 'fs'
import FileHelper from '../../src/fileHelper.js'

import Routes from './../../src/routes.js'

describe('#FileHelper', () => {

    describe('#getFileStatus', () => {
        test('it should return files statuses in correct format', async () => {
            const stats = {
                dev: 64769,
                mode: 33204,
                nlink: 1,
                uid: 1001,
                gid: 1001,
                rdev: 0,
                blksize: 4096,
                ino: 2501673,
                size: 8364,
                blocks: 24,
                atimeMs: 1631059450358.047,
                mtimeMs: 1631059450358.047,
                ctimeMs: 1631059450366.047,
                birthtimeMs: 1631059450358.047,
                atime: "2021-09-08T00:04:10.358Z",
                mtime: "2021-09-08T00:04:10.358Z",
                ctime: "2021-09-08T00:04:10.366Z",
                birthtime: "2021-09-08T00:04:10.358Z"
              }

              const userMocked = process.env.USER
              const filename = 'file.xls'

              jest
                .spyOn(fs.promises, fs.promises.readdir.name)
                .mockResolvedValue([filename])

                jest
                .spyOn(fs.promises, fs.promises.stat.name)
                .mockResolvedValue(stats)

            const result = await FileHelper.getFilesStatus('/tmp')
            
            const expectedResult = [
                {
                    size: '8.36 kB',
                    lastModified: stats.birthtime,
                    owner: userMocked,
                    file: filename
                }
            ]

            expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${filename}`)
            expect(result).toMatchObject(expectedResult)
        })
    })
})