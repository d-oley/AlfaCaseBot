// appState.js
// - хранит данные текущего пользователя
// - хранит набор кейсов и мок-данные рейтинга
// - функции изменения состояния (авторизация, профиль, аватар и т.д.)
import { reactive } from 'vue'
import noPhotoImage from '@/assets/no-photo.png'

// Список ролей для селекторов в регистрации и профиле.
const roleOptions = [
  'Учащийся 1 класса',
  'Учащийся 2 класса',
  'Учащийся 3 класса',
  'Учащийся 4 класса',
  'Учащийся 5 класса',
  'Учащийся 6 класса',
  'Учащийся 7 класса',
  'Учащийся 8 класса',
  'Учащийся 9 класса',
  'Учащийся 10 класса',
  'Учащийся 11 класса',
  'Учащийся СПО',
  'Студент',
  'Другое',
]

// Каталог кейсов (пока локально)
// теги, как и бизнес-кейсы ждем, но уже можно, я думаю, попробовать подключиться к бд и подтягивать оттуда
// чтобы было по-человечески
const cases = [
  {
    id: 1,
    title: 'Кейс 1',
    description: 'Оптимизируйте воронку регистрации в мобильном приложении банка.',
    fullDescription:
      'Проанализируйте текущую воронку регистрации, найдите узкие места и предложите план улучшений с оценкой влияния на конверсию.',
    tags: ['Аналитика', 'Продукт', 'UX'],
    solvedScore: 8.4,
  },
  {
    id: 2,
    title: 'Кейс 2',
    description: 'Подберите стратегию роста аудитории молодежного продукта.',
    fullDescription:
      'Сформируйте гипотезы роста, предложите каналы привлечения и опишите метрики успеха для каждого этапа эксперимента.',
    tags: ['Маркетинг', 'Growth'],
    solvedScore: 7.9,
  },
  {
    id: 3,
    title: 'Кейс 3',
    description: 'Снизьте отток пользователей после первого месяца.',
    fullDescription:
      'Оцените причины churn, предложите сегментацию и разработайте меры удержания с расчетом ожидаемого эффекта.',
    tags: ['Retention', 'Аналитика'],
    solvedScore: 8.1,
  },
  {
    id: 4,
    title: 'Кейс 4',
    description: 'Разработайте продуктовую концепцию для школьной аудитории.',
    fullDescription:
      'Соберите ценностное предложение, определите JTBD и опишите MVP с логикой запуска и проверкой гипотез.',
    tags: ['Продукт', 'Исследования'],
    solvedScore: 7.5,
  },
  {
    id: 5,
    title: 'Кейс 5',
    description: 'Подготовьте roadmap для функции персональных рекомендаций.',
    fullDescription:
      'Опишите этапы внедрения рекомендаций: сбор данных, ранжирование контента, контроль качества и метрики эффективности.',
    tags: ['AI', 'Продукт', 'Roadmap'],
    solvedScore: 8.8,
  },
  {
    id: 6,
    title: 'Кейс 6',
    description: 'Улучшите клиентский путь в онлайн-чате поддержки.',
    fullDescription:
      'Разберите текущий сценарий поддержки, выделите критичные точки и предложите формат сервисных улучшений.',
    tags: ['Сервис', 'UX'],
    solvedScore: 7.2,
  },
  {
    id: 7,
    title: 'Кейс 7',
    description: 'Постройте систему оценки качества решений для кейс-тренажера.',
    fullDescription:
      'Определите критерии оценки, весовую схему, набор метрик и формат обратной связи для пользователя.',
    tags: ['ML', 'Аналитика', 'Метрики'],
    solvedScore: 8.6,
  },
]

const getDefaultUser = () => ({
  id: null,
  username: '',
  email: '',
  login: '',
  birthDate: '',
  role: '',
  creationDate: '',
  avatarUrl: '',
  rank: 57,
})

//реактивный store приложения
export const appState = reactive({
  isAuthenticated: false,
  user: getDefaultUser(),
  topUsers: [
    { id: 1, login: 'PukiKaki', points: 985, avatarUrl: '' },
    { id: 2, login: 'AlphaSamets', points: 912, avatarUrl: '' },
    { id: 3, login: 'Theresnohope', points: 874, avatarUrl: '' },
  ],
  cases,
  recommendedCaseId: 5,
  userSolvedCases: [
    { caseId: 1, score: 8.4 },
    { caseId: 3, score: 8.1 },
    { caseId: 5, score: 8.8 },
  ],
  noPhotoImage,
})

// Сохранение пользователя в state после регистрации.
export const registerUser = (payload) => {
  appState.isAuthenticated = true
  appState.user = {
    ...appState.user,
    id: payload.id || null,
    username: payload.username || payload.login || '',
    email: payload.email || '',
    login: payload.login || payload.username || '',
    birthDate: payload.birthDate || '',
    role: payload.role || '',
    creationDate: payload.creationDate || '',
  }
}

// Сохранение пользователя в state после входа
export const loginUser = (payload) => {
  appState.isAuthenticated = true
  appState.user = {
    ...appState.user,
    id: payload.id || appState.user.id,
    username: payload.username || appState.user.username,
    email: payload.email || appState.user.email,
    login: payload.login || payload.username || appState.user.login || 'Пользователь',
    role: payload.role || appState.user.role || 'Студент',
    birthDate: payload.birthDate || appState.user.birthDate,
    creationDate: payload.creationDate || appState.user.creationDate,
  }
}

// полный сброс состояния авторизации
export const logoutUser = () => {
  appState.isAuthenticated = false
  appState.user = getDefaultUser()
}

// изменение аватарки пользователя. пока локально
export const setUserAvatar = (avatarUrl) => {
  appState.user.avatarUrl = avatarUrl
}

// обновление базовых полей профиля из формы редактирования
export const updateUserProfile = (payload) => {
  appState.user = {
    ...appState.user,
    login: payload.login ?? appState.user.login,
    username: payload.username ?? appState.user.username,
    email: payload.email ?? appState.user.email,
    birthDate: payload.birthDate ?? appState.user.birthDate,
    role: payload.role ?? appState.user.role,
  }
}

// Удаление профиля в рамках локальной демо-логики
export const deleteUserProfile = () => {
  appState.isAuthenticated = false
  appState.user = getDefaultUser()
  appState.userSolvedCases = []
}

// Поиск кейса по id
export const getCaseById = (caseId) => {
  const numericId = Number(caseId)
  return appState.cases.find((item) => item.id === numericId) || null
}

// Возвращает список решенных кейсов текущего пользователя
// в формате, удобном для отображения на странице профиля
export const getSolvedCasesForUser = () =>
  appState.userSolvedCases
    .map((entry) => {
      const caseItem = getCaseById(entry.caseId)
      return caseItem
        ? {
            caseId: caseItem.id,
            title: caseItem.title,
            score: entry.score,
          }
        : null
    })
    .filter(Boolean)

export const getRoleOptions = () => roleOptions
