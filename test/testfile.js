// Press F8 to start and F9 to cancel the process
console.log(__dirname)
console.log('\x1b[36m', 'sometext', '\x1b[0m')
function endlessCount (i) {
  console.log(i)
  setTimeout(() => {
    endlessCount(++i)
  }, 1000)
}

console.log(process.env.NODE_ENV)
console.log(process.execArgv)
console.log(process.argv)

endlessCount(1)

