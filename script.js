const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync')

// get folder and filenames
const targetFilesPath = path.join(__dirname, 'targetFiles')

const getFolderAndFileNames = () => {
  const folders = []
  const files = []

  const foldersAndFiles = fs
    .readdirSync(targetFilesPath, { withFileTypes: true })
    .forEach(dirent => {
      const isFolder = dirent.isDirectory()

      if (isFolder) {
        return folders.push(dirent.name)
      }

      files.push(dirent.name)
    })

  return { folders, files }
}

const foldersAndFiles = getFolderAndFileNames()

const filesWithoutExtensions = foldersAndFiles.files.map(fullFileName => {
  const fileNameOnly = fullFileName.match(/[^\.]+/)[0]
  return {
    fullName: fullFileName,
    withoutPrefix: fileNameOnly,
    ext: path.extname(fullFileName)
  }
})


// kick out all files that match a folder name, sans prefix
const filesWithoutFolders = filesWithoutExtensions.filter(fileDetails => {
  const found = Boolean(foldersAndFiles.folders.some(folderName => folderName === fileDetails.withoutPrefix))
  return !found
})

// for each remaining file
// read its contents
// for each source row
// capture the name, property address 1
// add to a final array of row objects

const mobileReadyRows = []

filesWithoutFolders.forEach(fileDetails => {
  const { fullName, withoutPrefix, ext } = fileDetails;
  const targetFile = path.join(__dirname, 'targetFiles', fullName)

  const fileContents = fs.readFileSync(targetFile, 'utf-8')

  if (ext === ".CSV" || ext === ".csv") {

    const records = parse(fileContents, { columns: true, skipEmptyLines: true });
    records.forEach(record => {
      const rowNames = Object.keys(record)
      const getFilteredRow = getFiltredObject(record)

      rowNames.forEach(rowName => {
        let regex = /^Phone[0-9]+_Number$/i;
        const isPhoneNumberRow = regex.test(rowName)
        if (isPhoneNumberRow) {
          const isNotBlank = record[rowName].length > 0
          if (isNotBlank) {
            // add a record to the master array
            const mobileRecord = {
              phone: record[rowName],
              ...getFilteredRow
            }
            mobileReadyRows.push(mobileRecord)
          }
        }
      })
    })

    if (mobileReadyRows.length) {
      const saveFolderPath = path.join(__dirname, 'targetFiles', withoutPrefix)
      fs.mkdirSync(saveFolderPath)
      const headers = Object.keys(mobileReadyRows[0]).map(key => ({ id: key, title: key }))
      const filePath = path.join(saveFolderPath, `${withoutPrefix} flat by phone number.csv`)
      const createCsvWriter = require('csv-writer').createObjectCsvWriter;
      const csvWriter = createCsvWriter({
        path: filePath,
        header: headers
      })
      csvWriter
        .writeRecords(mobileReadyRows)
        .then(() => {
          console.log('successfully wrote file')
        })
        .catch(e => {
          throw new Error(e)
        })
    }
  } else if (ext === ".xlsx" || ext === ".XLSX") {
    //  handle xlsx file
  }

})



function getFiltredObject(object) {
  let regexOne = /^Phone[0-9]+_Last_Seen$/i;
  let regexTwo = /^Phone[0-9]+_Score$/i;
  let regexThree = /^Phone[0-9]+_Type$/i;
  let regexFour = /^Phone[0-9]+_Number$/i;

  const newObject = {}
  for (const key in object) {
    if (Object.hasOwnProperty.call(object, key)) {
      if (!(regexOne.test(key) || regexTwo.test(key) || regexThree.test(key) || regexFour.test(key))) {
        const value = object[key];
        newObject[key] = value
      }
    }
  }
  return newObject
}