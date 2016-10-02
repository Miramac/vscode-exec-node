// Press F8 to start and F9 to cancel the process
function endlessCount (i) {
  console.log(i)
  setTimeout(() => {
    endlessCount(++i)
  }, 1000)
}
endlessCount(1)
