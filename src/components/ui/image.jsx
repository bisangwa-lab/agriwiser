import { forwardRef,useState } from 'react';
// Native responsive images with an app-owned fallback, no remote image SDK.
const Image=forwardRef(({src,alt='',fittingType='fill',originWidth,originHeight,focalPointX,focalPointY,quality,onError,style,...props},ref)=>{
 const [failed,setFailed]=useState(null);
 return <img ref={ref} src={!src||failed===src?'/favicon.svg':src} alt={alt} loading="lazy" decoding="async" width={originWidth} height={originHeight} style={{objectFit:fittingType==='fit'?'contain':'cover',...style}} {...props} onError={event=>{if(failed!==src){setFailed(src);onError?.(event);}}}/>;
});
Image.displayName='Image';
export {Image};
