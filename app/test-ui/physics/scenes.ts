export type PhysicsSceneId = 'sandbox' | 'magnet' | 'burst'

export const PHYSICS_SCENES: Array<{
  id: PhysicsSceneId
  label: string
  hint: string
  prompt: string
}> = [
  {
    id: 'sandbox',
    label: '스로우',
    hint: '커버를 잡고 던지세요. Matter.js가 중력·충돌·회전을 계산합니다.',
    prompt: '카드를 드래그해서 던지세요',
  },
  {
    id: 'magnet',
    label: '어트랙터',
    hint: '커서가 중력원입니다. 커버가 포인터 주위를 궤도로 돕니다.',
    prompt: '마우스를 천천히 움직여 보세요',
  },
  {
    id: 'burst',
    label: '임팩트',
    hint: '클릭하면 충격파가 퍼집니다. 조각을 다시 붙잡거나 튕겨 보세요.',
    prompt: '빈 곳을 클릭해 충격파를 만드세요',
  },
]
