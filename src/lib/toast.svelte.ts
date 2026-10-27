export const toast = $state({msg: '', show: false});
let timer: ReturnType<typeof setTimeout>;
export function notify(msg: string) {
  toast.msg = msg;
  toast.show = true;
  clearTimeout(timer);
  timer = setTimeout(() => { toast.show = false; }, 3500);
}
