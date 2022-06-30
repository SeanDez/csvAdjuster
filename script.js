const path = require('path');
const fs = require('fs');
const reader = require('xlsx')
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
      const filePath = path.join(saveFolderPath, `${withoutPrefix} flat by phone number.xlsx`)
      fs.writeFile(filePath, '', function (err) {
        if (err) throw err;

        const file = reader.readFile(filePath)
        let data = mobileReadyRows

        const ws = reader.utils.json_to_sheet(data)
        file.SheetNames.pop() // remove default sheet
        reader.utils.book_append_sheet(file, ws, "Sheet1")

        reader.writeFile(file, filePath)
      });
    }
  } else if (ext === ".xlsx" || ext === ".XLSX") {
    const workBook = reader.readFile(targetFile)
    const jsonDataPerSheet = [] //* [{sheetName: 'name', data:[]}]
    workBook.SheetNames.forEach(y => {
      var worksheet = workBook.Sheets[y];

      const rows = reader.utils.sheet_to_json(worksheet)
      const filteredRows = []
      if (rows.length) {
        let columnNames = []
        rows.forEach((row, i) => {
          if (i === 0) {
            columnNames = Object.keys(row)
          }
          const getFilteredRow = getFiltredObject(row)
          columnNames.forEach(columnName => {
            let regex = /^Phone[0-9]+_Number$/i;
            const isPhoneNumberRow = regex.test(columnName)
            if (isPhoneNumberRow) {
              const isNotBlank = row[columnName] ?? false
              if (isNotBlank) {
                // add a record to the master array
                const record = {
                  phone: row[columnName],
                  ...getFilteredRow
                }
                filteredRows.push(record)
              }
            }
          })
        })
      }
      if(filteredRows.length){
        jsonDataPerSheet.push({ name: y, data: filteredRows })
      }
    })
    if (jsonDataPerSheet.length) {
      const saveFolderPath = path.join(__dirname, 'targetFiles', withoutPrefix)
      fs.mkdirSync(saveFolderPath)
      const filePath = path.join(saveFolderPath, `${withoutPrefix} flat by phone number.xlsx`)
      fs.writeFile(filePath, '', function (err) {
        if (err) throw err;

        const file = reader.readFile(filePath)
        file.SheetNames.pop() // remove default sheet

        jsonDataPerSheet.forEach(sheet => {
          const ws = reader.utils.json_to_sheet(sheet.data)
          reader.utils.book_append_sheet(file, ws, sheet.name)
        })
        reader.writeFile(file, filePath)
      });
    }
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