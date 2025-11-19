// 헤더 로드 및 이벤트 리스너 설정
function loadHeader() {
  fetch('header.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('header-container').innerHTML = data;

      // 로고 클릭 시 홈으로 이동
      document.getElementById('logoLink').addEventListener('click', () => {
        window.location.href = 'index.html';
      });

      // 버튼 이벤트 리스너 추가
      document.getElementById('openLinkBtn1').addEventListener('click', () => {
        window.open('https://naver.me/xAWjFEtu', '_blank');
      });

      document.getElementById('openLinkBtn2').addEventListener('click', () => {
        window.location.href = 'gifsvg.html';
      });

      document.getElementById('openLinkBtn3').addEventListener('click', () => {
        window.location.href = 'https://entrywiki.org/w/%E3%8B%A1%EA%A7%81%EC%A0%95%EB%B9%88777%EA%A7%82';
      });

      document.getElementById('imgBtn').addEventListener('click', () => {
        window.location.href = 'img.html';
      });

      document.getElementById('chatBtn').addEventListener('click', () => {
        window.location.href = 'chat.html';
      });

      document.getElementById('urlBtn').addEventListener('click', () => {
        window.location.href = 'https://url.jbjb.r-e.kr';
      });
      // ✅ 햄버거 메뉴 토글 기능 추가
      const menuToggle = document.getElementById('menuToggle');
      const navMenu = document.querySelector('nav');

      if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
          navMenu.classList.toggle('active');
          menuToggle.classList.toggle('open');
        });
      }
    })
    .catch(error => console.error('헤더 로드 실패:', error));
}

// 페이지 로드 시 헤더 불러오기
document.addEventListener('DOMContentLoaded', loadHeader);
