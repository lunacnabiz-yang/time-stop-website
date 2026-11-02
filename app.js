const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.textContent='메뉴';}
menuButton.addEventListener('click',()=>{const open=navigation.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));menuButton.textContent=open?'메뉴 닫기':'메뉴';});
navigation.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{closeMenu();navigation.querySelectorAll('a').forEach(a=>a.removeAttribute('aria-current'));link.setAttribute('aria-current','location');}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigation.classList.contains('open')){closeMenu();menuButton.focus();}});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){navigation.querySelectorAll('a').forEach(a=>{if(a.hash==='#'+entry.target.dataset.menu)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}}},{rootMargin:'-10% 0px -55% 0px',threshold:0});document.querySelectorAll('[data-menu]').forEach(section=>observer.observe(section));}
document.querySelector('#inquiry').addEventListener('submit',event=>{event.preventDefault();const data=new FormData(event.target);const content=`시간정류장 도입 문의 준비\n\n성함 또는 회사명: ${data.get('name')}\n희망 공간: ${data.get('place')}\n\n문의 내용\n${data.get('message')}\n\n이 파일은 문의 준비용이며 실제 상담 접수나 전송은 되지 않았습니다.`;const url=URL.createObjectURL(new Blob(['\ufeff',content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='시간정류장-문의내용.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#form-status').textContent='문의 파일 저장을 요청했습니다. 실제 상담 접수나 전송은 되지 않았습니다.';});
const film=document.getElementById('product-film');
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
function filmError(){document.getElementById('film-status').textContent='영상을 불러오지 못했습니다. 아래 제품 사진을 확인해 주세요.';}
film.muted=true;
film.addEventListener('error',filmError);
film.querySelector('source').addEventListener('error',filmError);
if(!motionPreference.matches)film.play().catch(filmError);
motionPreference.addEventListener('change',e=>{if(e.matches)film.pause();else film.play().catch(filmError);});

const guideSteps=[
 ['이용 동의','사진 촬영과 처리 안내를 확인합니다.','02'],
 ['구성 선택','3컷 또는 4컷과 원하는 사진 테두리를 고릅니다.','04'],
 ['매수·결제','인화할 매수를 선택하고 결제를 진행합니다.','05'],
 ['촬영','카메라를 보며 숫자 안내에 맞춰 촬영합니다.','07'],
 ['사진 선택','촬영한 사진에서 마음에 드는 컷을 고릅니다.','10'],
 ['나이 변환','사진 속 인물과 변환할 연령대를 선택합니다.','12'],
 ['사진 받기','인화물을 받고 사진 받기 코드로 휴대폰에 저장합니다.','16']
];
const stepButtons=Array.from(document.querySelectorAll('.step-button'));
const stepPreview=document.getElementById('step-preview');
const previewSlot=document.getElementById('step-preview-slot');
const phoneGuide=window.matchMedia('(max-width: 767px)');
let selectedStep=0;
let mobileOpen=false;
function placeStepPreview(){
  stepButtons.forEach((button,index)=>{
    button.setAttribute('aria-pressed',String(index===selectedStep));
    if(phoneGuide.matches)button.setAttribute('aria-expanded',String(mobileOpen&&index===selectedStep));
    else button.removeAttribute('aria-expanded');
  });
  if(phoneGuide.matches){
    stepButtons[selectedStep].parentElement.append(stepPreview);
    stepPreview.hidden=!mobileOpen;
  }else{
    previewSlot.append(stepPreview);
    stepPreview.hidden=false;
  }
}
stepButtons.forEach((button,index)=>button.addEventListener('click',()=>{
  const step=guideSteps[index];
  mobileOpen=!(mobileOpen&&selectedStep===index);
  selectedStep=index;
  document.getElementById('step-image').src='assets/screen-'+step[2]+'.jpg';
  document.getElementById('step-image').alt=step[0]+' 이용 화면 예시';
  document.getElementById('step-index').textContent=(index+1)+'단계 / 7단계';
  document.getElementById('step-title').textContent=step[0];
  document.getElementById('step-copy').textContent=step[1];
  placeStepPreview();
  if(phoneGuide.matches&&mobileOpen){
    button.parentElement.scrollIntoView({behavior:motionPreference.matches?'instant':'smooth',block:'start'});
  }
}));
phoneGuide.addEventListener('change',placeStepPreview);
placeStepPreview();
