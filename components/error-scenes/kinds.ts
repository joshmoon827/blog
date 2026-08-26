export type ErrorKind = '404' | '500' | '401' | '403' | 'offline'
export type ErrorVersion = 1 | 2 | 3

export type ErrorCopy = {
  digits: string[]
  label: string
  tape: string[]
  v1: { kicker: string; ko: string; en: string }
  v2: { kicker: string; ko: string; en: string }
  v3: { kicker: string; ko: string; en: string }
}

export const ERROR_KINDS: Record<ErrorKind, ErrorCopy> = {
  '404': {
    digits: ['4', '0', '4'],
    label: '404',
    tape: ['missing', '없는 페이지', '404', 'not found'],
    v1: {
      kicker: '09 / MISSING · stagger',
      ko: '이 글은 없거나 치웠습니다. 숫자가 하나씩 올라옵니다.',
      en: 'This page is gone. The digits rise in one by one.',
    },
    v2: {
      kicker: '12 / DRIFT · parallax',
      ko: '마우스를 옮기면 숫자가 따로 떠다닙니다. 없는 페이지는 여기까지입니다.',
      en: 'Move the pointer and the digits drift apart. This page is not here.',
    },
    v3: {
      kicker: '13 / CLIP · reveal',
      ko: '아래에서 숫자가 드러납니다. 홈으로 돌아가면 됩니다.',
      en: 'The number uncovers from the bottom. Head home.',
    },
  },
  '500': {
    digits: ['5', '0', '0'],
    label: '500',
    tape: ['fault', '서버 오류', '500', 'broken'],
    v1: {
      kicker: '10 / FAULT · stagger',
      ko: '페이지를 그리는 동안 문제가 생겼습니다. 숫자가 하나씩 올라옵니다.',
      en: 'Something broke while drawing this page. The digits rise in one by one.',
    },
    v2: {
      kicker: '10 / FAULT · parallax',
      ko: '마우스를 옮기면 숫자가 따로 떠다닙니다. 자세한 내용은 숨겼습니다.',
      en: 'Move the pointer and the digits drift. Details stay hidden.',
    },
    v3: {
      kicker: '10 / FAULT · reveal',
      ko: '아래에서 숫자가 드러납니다. 다시 시도하거나 홈으로 돌아가면 됩니다.',
      en: 'The number uncovers from the bottom. Retry or head home.',
    },
  },
  '401': {
    digits: ['4', '0', '1'],
    label: '401',
    tape: ['unauthorized', '로그인 필요', '401', 'sign in'],
    v1: {
      kicker: '14 / AUTH · stagger',
      ko: '이 페이지는 로그인이 필요합니다. 숫자가 하나씩 올라옵니다.',
      en: 'You need to sign in for this page. The digits rise in one by one.',
    },
    v2: {
      kicker: '14 / AUTH · parallax',
      ko: '마우스를 옮기면 숫자가 따로 떠다닙니다. 로그아웃 상태에서는 여기까지입니다.',
      en: 'Move the pointer and the digits drift. You’re signed out — this page stops here.',
    },
    v3: {
      kicker: '14 / AUTH · reveal',
      ko: '아래에서 숫자가 드러납니다. 로그인하거나 홈으로 돌아가면 됩니다.',
      en: 'The number uncovers from the bottom. Sign in or head home.',
    },
  },
  '403': {
    digits: ['4', '0', '3'],
    label: '403',
    tape: ['forbidden', '권한 없음', '403', 'no access'],
    v1: {
      kicker: '15 / DENIED · stagger',
      ko: '이 페이지에 대한 권한이 없습니다. 숫자가 하나씩 올라옵니다.',
      en: 'You don’t have access to this page. The digits rise in one by one.',
    },
    v2: {
      kicker: '15 / DENIED · parallax',
      ko: '마우스를 옮기면 숫자가 따로 떠다닙니다. 여기는 열 수 없는 페이지입니다.',
      en: 'Move the pointer and the digits drift. This page isn’t open to you.',
    },
    v3: {
      kicker: '15 / DENIED · reveal',
      ko: '아래에서 숫자가 드러납니다. 홈으로 돌아가면 됩니다.',
      en: 'The number uncovers from the bottom. Head home.',
    },
  },
  offline: {
    digits: ['O', 'F', 'F', 'L', 'I', 'N', 'E'],
    label: 'OFFLINE',
    tape: ['offline', '연결 없음', 'cache', '끊김'],
    v1: {
      kicker: '11 / OFFLINE · stagger',
      ko: '연결이 없습니다. 글자가 하나씩 올라옵니다.',
      en: 'You’re offline. The letters rise in one by one.',
    },
    v2: {
      kicker: '11 / OFFLINE · parallax',
      ko: '마우스를 옮기면 글자가 따로 떠다닙니다. 이미 열어 둔 글은 캐시에 있을 수 있습니다.',
      en: 'Move the pointer and the letters drift. Posts you already opened may still be in cache.',
    },
    v3: {
      kicker: '11 / OFFLINE · reveal',
      ko: '아래에서 글자가 드러납니다. 캐시된 글이 있으면 아래에서 이어 읽으면 됩니다.',
      en: 'The word uncovers from the bottom. Keep reading from cache if you have it.',
    },
  },
}
