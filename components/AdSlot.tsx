
'use client'
import { useEffect } from 'react'

export default function AdSlot(){
  useEffect(() => {
    try{
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    }catch{}
  },[])

  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  if(!client){
    return (
      <div className="rounded-xl p-4 border border-dashed border-gray-700 text-sm text-gray-400 text-center">
        AdSense 클라이언트 ID가 설정되면 광고가 표시됩니다.
      </div>
    )
  }

  return (
    <ins className="adsbygoogle"
      style={{display:'block'}}
      data-ad-client={client}
      data-ad-slot="0000000000"
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
