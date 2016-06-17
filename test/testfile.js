
function endlessCountt(i) {
  console.log(i)
  setTimeout(()=> {
      endlessCountt(++i)
  },1000)
}
endlessCountt(1)
