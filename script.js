const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync')

// get folder and filenames
const targetFilesPath = path.join( __dirname, 'targetFiles' )

const getFolderAndFileNames = () => {
  const folders = []
  const files = []

  const foldersAndFiles = fs
    .readdirSync( targetFilesPath, { withFileTypes: true } )
    .forEach( dirent => {
      const isFolder = dirent.isDirectory()
      
      if (isFolder) {
        return folders.push(dirent.name)
      }

      files.push(dirent.name)
    } )

  return { folders, files }
}

const foldersAndFiles = getFolderAndFileNames()

const filesWithoutExtensions = foldersAndFiles.files.map( fullFileName => {
  const fileNameOnly = fullFileName.match(/[^\.]+/)[0]
  return {
    fullName: fullFileName,
    withoutPrefix: fileNameOnly,
  }
} )

// kick out all files that match a folder name, sans prefix
const filesWithoutFolders = filesWithoutExtensions.filter( fileDetails => {
  const found = Boolean( foldersAndFiles.folders.some(folderName => folderName === fileDetails.withoutPrefix) )
  return !found
})

// for each remaining file
  // read its contents
  // for each source row
  // capture the name, property address 1
  // add to a final array of row objects

const mobileReadyRows = []

filesWithoutFolders.forEach( fileDetails => {
  const { fullName, withoutPrefix } = fileDetails;
  const targetFile = path.join( __dirname, 'targetFiles', fullName )

  const fileContents = fs.readFileSync(targetFile, 'utf-8')

  const records = parse(fileContents, { columns: true, skipEmptyLines: true });

  records.forEach( record => {
    const { Input_First_Name, Input_Property_Address } = record

    const rowNames = Object.keys( record )
    const phoneNumberKeys = rowNames.filter(rowName => {
      const isPhoneNumberRow = /Phone\d+_Number/.test(rowName)
      if (isPhoneNumberRow) {
        const isNotBlank = record[rowName].length > 0
        if (isNotBlank) {
          // add a record to the master array
          const mobileRecord = {
            name: Input_First_Name.toLowerCase(),
            phone: record[rowName],
            propertyaddress: Input_Property_Address,
          }
  
          mobileReadyRows.push( mobileRecord )
        }
      }
    })
  } )

  // split the file
  const remainingMobileRows = [ ...mobileReadyRows ]
  let fileBatchSize = process.argv[2] ?? 50

  const totalRowCount = mobileReadyRows.length
  let rowPointer = 0
  let fileNumber = 1

  while (rowPointer < totalRowCount) {
    // grab the next x rows
    // load 50 rows
    
    const rowsForThisFile = []

      for (let i = 0; i < fileBatchSize; i++) {
        if (rowPointer >= totalRowCount) {
          break;
        }

        rowsForThisFile.push(remainingMobileRows[rowPointer])
        rowPointer += 1        
      }

    // save to a file using current prefix
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const separatedFilePath = path.join( __dirname, 'targetFiles', withoutPrefix, `${withoutPrefix}-${fileNumber}.csv` )

    const csvWriter = createCsvWriter({
      path: separatedFilePath,
      header: [
        { id: 'name', title: 'name' },
        { id: 'phone', title: 'phone' },
        { id: 'propertyaddress', title: 'propertyaddress' },
      ]
    })

    csvWriter
      .writeRecords( rowsForThisFile )
        .then(() => {
          console.log( `wrote to file ${fileNumber}` )
        })
        .catch( e => { throw new Error(e) } )

    // update the pointer
    fileNumber += 1
  }


  const x = 0;
} )
















