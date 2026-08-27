const ENDPOINT="https://manager.gtraffic.io/api/cong-khai/tao-lien-ket";
const PUBLIC_BASE="https://gtraffic.io";

function validUrl(value){
  try{
    const u=new URL(String(value||"").trim());
    return u.protocol==="http:"||u.protocol==="https:"?u.href:"";
  }catch{return "";}
}

export async function shortenGTraffic(token,destination){
  const apiKey=String(token||"").trim();
  const target=validUrl(destination);
  if(!apiKey)throw new Error("GTraffic API token chưa được cấu hình");
  if(!target)throw new Error("URL cần rút gọn không hợp lệ");

  const url=new URL(ENDPOINT);
  url.searchParams.set("apikey",apiKey);
  url.searchParams.set("url",target);

  const response=await fetch(url.toString(),{
    method:"GET",
    headers:{Accept:"application/json,text/plain,*/*"},
    redirect:"follow",
    cache:"no-store"
  });

  const text=await response.text();
  let data=null;
  try{data=text?JSON.parse(text):null;}catch{}

  if(!response.ok){
    const detail=typeof data?.message==="string"?data.message:typeof data?.error==="string"?data.error:text.replace(/\s+/g," ").trim().slice(0,240);
    throw new Error("GTraffic HTTP "+response.status+(detail?": "+detail:""));
  }

  const id=String(data?.id||"").trim();
  if(!id)throw new Error("GTraffic trả về phản hồi không có mã id");

  const returned=validUrl(data?.shortenedUrl||data?.shortened_url||data?.short_url||"");
  if(returned)return returned;

  return PUBLIC_BASE+"/"+encodeURIComponent(id);
}
