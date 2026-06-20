# 지인 취향 지도

지인별 취향, 선물, 만남 이력을 관리하는 개인용 웹앱

## 기술 스택

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router 7, Axios
- **Backend**: Spring Boot 4, Java 21, Spring Data JPA, Lombok
- **Database**: MySQL 8

## 프로젝트 구조

```
Project5/
├── frontend/   # React 앱
└── backend/    # Spring Boot 앱
```

## 실행 방법

**백엔드**
```bash
cd backend
./gradlew bootRun
```

**프론트엔드**
```bash
cd frontend
npm install
npm run dev
```

## 주요 기능

- 지인 프로필 관리 (이름, 관계, 생일)
- 취향 데이터 (좋아하는 음식, 알레르기, 관심사 등)
- 선물 기록 및 위시리스트
- 만남 이력 관리
- 그룹 교집합 필터 (여러 명 선택 시 공통 음식 계산)
