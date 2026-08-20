/* ============================================================
   Writed. — i18n (ru / en)
   ============================================================ */
(function () {
  const STRINGS = {
    ru: {
      /* ---- time ---- */
      time_just_now: "только что",
      time_min: "мин назад",
      time_h: "ч назад",
      time_yesterday: "вчера",
      time_d: "дн назад",

      /* ---- words ---- */
      word_one: "слово", word_few: "слова", word_many: "слов",
      words_written: "написано",
      editor_placeholder: "Пишите…",

      /* ---- plurals (project / chapter / note) ---- */
      proj_one: "проект", proj_few: "проекта", proj_many: "проектов",
      chap_one: "глава",  chap_few: "главы",  chap_many: "глав",
      note_one: "заметка", note_few: "заметки", note_many: "заметок",

      /* ---- theme toggle ---- */
      theme_to_dark: "Тёмная тема", theme_to_light: "Светлая тема",
      stats_title: "Статистика",

      /* ---- topbar ---- */
      topbar_profile: "Профиль",

      /* ---- sort ---- */
      sort_btn_title: "Сортировка",
      sort_header: "Сортировать",
      sort_created_desc: "Сначала новые",
      sort_created_asc: "Сначала старые",
      sort_updated: "Недавно изменённые",
      sort_title_asc: "По названию · А–Я",

      /* ---- greetings ---- */
      greet_night: "Доброй ночи",
      greet_morning: "Доброе утро",
      greet_day: "Добрый день",
      greet_evening: "Добрый вечер",

      /* ---- dashboard ---- */
      dash_subtitle: "сегодня?",
      dash_words_total: "слов всего",
      btn_new_project: "Новый проект",
      btn_new_note: "Новая заметка",
      desc_project: "книга · главы",
      desc_note: "одиночный лист",
      filter_type_label: "тип",
      filter_all: "Всё",
      filter_projects: "Проекты",
      filter_notes: "Заметки",
      filter_status_label: "статус",
      filter_all_status: "Все",
      filter_drafts: "Черновики",
      filter_done: "Завершённые",
      section_projects: "Проекты",
      section_notes: "Заметки",
      empty_state: "Здесь пока пусто. Начните с нового проекта.",
      footer_local: "хранится локально на этом устройстве",
      status_done: "завершён",
      status_draft: "черновик",
      del_project_title: "Удалить проект",
      del_note_title: "Удалить заметку",
      empty_note_preview: "пустая заметка",
      project_not_found: "Проект не найден",
      all_works: "все работы",
      synopsis_placeholder: "+ добавить синопсис",
      words_goal_label: "слов · цель",
      mark_done: "завершён",
      mark_in_progress: "отметить завершённым",
      delete_project_btn: "удалить проект",
      section_chapters: "Главы",
      add_chapter_btn: "Добавить главу",
      no_chapters: "Ни одной главы. Создайте первую →",
      assemble_book: "Собрать книгу",
      del_chapter_title: "Удалить главу",
      rename_hint: "Нажмите, чтобы переименовать",
      edit_synopsis_hint: "Нажмите для редактирования",

      /* ---- confirm delete modal ---- */
      confirm_delete_q: "Удалить",
      confirm_delete_body: "Это действие необратимо. Все данные будут утеряны.",
      confirm_cancel: "Отмена",
      confirm_delete_btn: "Удалить",
      what_project: "проект", what_note: "заметку", what_chapter: "главу",
      what_all: "все проекты, заметки и настройки",

      /* ---- editor ---- */
      ed_back: "Назад",
      ed_rename: "Переименовать",
      /* ---- updates ---- */
      upd_available: "Доступна новая версия Writed",
      upd_btn: "Обновить",
      upd_downloading: "Загрузка обновления",
      upd_done: "Обновление загружено",
      upd_open_dmg: "Откройте файл и перетащите Writed. в «Программы»",
      upd_open_apk: "Откройте файл, чтобы установить",
      upd_err: "Не удалось загрузить обновление",
      upd_retry: "Повторить",
      upd_dismiss: "Скрыть",

      ed_link: "Ссылка",
      link_url_placeholder: "https://example.com",
      link_apply: "Применить",
      link_remove: "Убрать ссылку",
      mode_edit: "Редактор",
      mode_preview: "Превью",
      ed_save: "Сохранить",
      ed_export_book: "Экспорт книги",
      ed_export_note: "Экспорт заметки",
      ed_delete_doc: "Удалить документ",
      focus_mode_btn: "Фокус",
      focus_exit_hint: "Esc — выйти из фокуса",
      focus_exit_btn: "Выйти из фокуса",
      doc_not_found: "Документ не найден",
      note_label: "Заметка",
      saved_flash: "сохранено ✓",
      read_min: "мин",

      /* ---- export book modal ---- */
      exp_book_eyebrow: "Собрать книгу",
      exp_chapters_label: "Главы",
      exp_of: "из",
      exp_section_structure: "Структура",
      exp_title_page: "Титульный лист",
      exp_toc: "Оглавление",
      exp_merge: "Убрать разделители между главами",
      exp_section_layout: "Вёрстка",
      exp_format: "Формат",
      exp_margins: "Поля",
      exp_margin_narrow: "узкие",
      exp_margin_normal: "обычные",
      exp_margin_wide: "широкие",
      exp_font: "Шрифт",
      exp_leading: "Интерлиньяж",
      exp_err_popup: "Разрешите всплывающие окна для печати в PDF",
      exp_toast_pdf: "Открыто окно печати — сохраните как PDF",
      exp_toast_pdf_tauri: "Сохранено для печати — откройте файл и распечатайте в PDF",
      exp_toast_docx: "Файл .doc скачан — откроется в Word",
      exp_toast_txt: "Текстовый файл скачан",
      exp_toast_md: "Markdown скачан",
      toc_title: "Содержание",
      preview_label: "предпросмотр",

      /* ---- export note modal ---- */
      exp_note_eyebrow: "Экспорт заметки",
      exp_section_decoration: "Оформление",
      exp_note_title_opt: "Заголовок заметки",

      /* ---- book preview ---- */
      anchors_show: "Содержание",
      anchors_hide: "Скрыть",
      scroll_top: "Наверх",

      /* ---- profile ---- */
      toast_avatar: "Фото обновлено",
      toast_name: "Имя сохранено",
      toast_backup_dl: "Бэкап скачан",
      toast_restore_ok: "Данные восстановлены",
      toast_restore_err: "Не удалось прочитать файл",
      toast_reset: "Данные сброшены",
      prof_eyebrow: "Профиль",
      prof_since: "с нами с",
      prof_upload_photo: "Загрузить фото",
      prof_avatar_alt: "Аватар",
      prof_section_settings: "Настройки",
      prof_lbl_name: "Имя",
      prof_lbl_theme: "Тема",
      prof_theme_light: "Светлая",
      prof_theme_dark: "Тёмная",
      prof_lbl_lang: "Язык",
      prof_lbl_tour: "Знакомство",
      prof_tour_btn: "Повторить тур",
      prof_section_data: "Данные",
      prof_data_note: "Всё хранится только на этом устройстве. Сделайте резервную копию, чтобы не потерять написанное.",
      prof_export_backup: "Экспорт бэкапа (JSON)",
      prof_import_backup: "Импорт бэкапа",
      prof_reset_btn: "Сбросить всё",
      prof_back: "на главную",
      stat_words_written: "слов написано",
      default_author: "Автор",

      /* ---- onboarding ---- */
      onb_steps: "03",
      onb_lang_q: "Выберите язык",
      onb_lang_hint: "Язык можно сменить в настройках",
      onb_lang_continue: "Продолжить",
      onb_kicker_0: "локально · приватно · ваше",
      onb_hero_0_1: "Чистый лист,",
      onb_hero_0_2: "и больше",
      onb_hero_0_3: "ничего",
      onb_lede_0: "Writed· — редактор для тех, кто пишет вдолгую. Никакого облака, никакого бэкенда. Текст остаётся на вашем устройстве — и только.",
      onb_cta_0: "Начать",
      onb_kicker_1: "шаг первый",
      onb_q_1: "Как к вам\nобращаться?",
      onb_name_placeholder: "ваше имя",
      onb_hint_1: "точка растёт от ваших слов — это вы её оживляете",
      onb_kicker_2: "шаг второй",
      onb_q_2: "При каком свете\nвы пишете?",
      onb_theme_light: "Тёплая бумага",
      onb_theme_dark: "Ночное письмо",
      onb_hint_2: "тему всегда можно сменить в настройках",
      onb_back: "Назад",
      onb_next: "Дальше",
      onb_finish: "Начать писать",

      /* ---- tour ---- */
      tour_intro_eyebrow: "тур по writed",
      tour_intro_title: "Знакомство за минуту",
      tour_intro_body: "Покажем главное: где живут проекты и заметки, как устроена книга и что умеет редактор. В любой момент можно пропустить.",
      tour_intro_cta: "Показать",
      tour_dash_eyebrow: "главный экран",
      tour_dash_title: "Живая точка",
      tour_dash_body: "Слово Writed. всегда возвращает на главную. А клик по самой точке раскрывает вашу статистику — сколько всего написано.",
      tour_create_eyebrow: "с чего начать",
      tour_create_title: "Проекты и заметки",
      tour_create_body: "Проект — это книга с главами и целью по словам. Заметка — одиночный лист для идей и набросков. Оба открываются в одном редакторе.",
      tour_filter_eyebrow: "порядок",
      tour_filter_title: "Черновики и готовое",
      tour_filter_body: "Фильтр прячет лишнее: оставьте только то, что в работе, или то, что уже завершено.",
      tour_card_eyebrow: "ваши работы",
      tour_card_title: "Карточка проекта",
      tour_card_body: "Каждая карточка показывает число глав, слов и прогресс к цели. Сейчас заглянем внутрь одного проекта.",
      tour_proj_eyebrow: "внутри проекта",
      tour_proj_title: "Всё правится на месте",
      tour_proj_body: "Нажмите на заголовок или синопсис — и пишите прямо поверх. Ничего сохранять вручную не нужно.",
      tour_goal_eyebrow: "цель",
      tour_goal_title: "Слова и прогресс",
      tour_goal_body: "Полоса показывает движение к цели по словам. Здесь же можно отметить проект завершённым.",
      tour_chap_eyebrow: "главы",
      tour_chap_title: "Структура книги",
      tour_chap_body: "Добавляйте главы по одной, а порядок меняйте перетаскиванием за ручку слева. Книга собирается из них.",
      tour_export_eyebrow: "финал",
      tour_export_title: "Собрать книгу",
      tour_export_body: "Когда рукопись готова — экспортируйте все главы в один файл одной кнопкой.",
      tour_tools_eyebrow: "редактор",
      tour_tools_title: "Инструменты текста",
      tour_tools_body: "Заголовки, цитаты, списки и выделение — самое нужное, без визуального шума. То же и в заметках.",
      tour_modes_eyebrow: "два взгляда",
      tour_modes_title: "Редактор и превью",
      tour_modes_body: "Переключайтесь между рабочим текстом и тем, как глава будет выглядеть в готовой книге.",
      tour_focus_eyebrow: "тишина",
      tour_focus_title: "Полный фокус",
      tour_focus_body: "Эта точка убирает весь интерфейс и оставляет только лист. Вернуться — клавишей Esc.",
      tour_count_eyebrow: "спокойствие",
      tour_count_title: "Счёт и сохранение",
      tour_count_body: "Внизу — счётчик слов и время чтения. Текст сохраняется сам после каждой паузы.",
      tour_outro_eyebrow: "готово",
      tour_outro_title: "Чистый лист ждёт",
      tour_outro_body: "Это всё, что нужно для начала. Повторить тур можно в профиле в любой момент.",
      tour_outro_cta: "Начать писать",
      tour_skip: "Пропустить тур",
      tour_back: "Назад",
      tour_next: "Дальше",

      /* ---- app ---- */
      app_splash_sub: "редактор для писателей",
      toast_project_created: "Проект создан",
      default_project_title: "Новый проект",
      default_note_title: "Новая заметка",

      /* ---- search ---- */
      search_title: "Поиск",
      search_btn: "Поиск",
      search_placeholder: "Искать по главам и заметкам…",
      search_placeholder_project: "Искать в проекте…",
      search_hint: "Enter — открыть · Esc — закрыть",
      search_empty: "Ничего не найдено",
      search_start: "Начните вводить запрос",
      search_in_title: "в названии",
      search_synopsis: "синопсис",
      search_results_n: "результатов",

      /* ---- undo / redo ---- */
      ed_undo: "Отменить",
      ed_redo: "Вернуть",

      /* ---- snapshots ---- */
      snap_title: "Версии",
      snap_btn: "Версии главы",
      snap_save: "Сохранить версию",
      snap_saved: "Версия сохранена",
      snap_empty: "Версий пока нет",
      snap_restore: "Восстановить",
      snap_delete: "Удалить версию",
      snap_deleted: "Версия удалена",
      snap_restored: "Версия восстановлена",
      snap_auto_name: "перед восстановлением",
      snap_confirm_title: "Восстановить эту версию?",
      snap_confirm_body: "Текущий текст будет сохранён отдельной версией, поэтому его можно вернуть.",
      snap_confirm_ok: "Восстановить",
      snap_name_placeholder: "Название версии (необязательно)",
      snap_limit: "Хранится до 30 последних версий",

      /* ---- goals ---- */
      goal_title: "Цель",
      goal_set: "Поставить цель",
      goal_edit: "Изменить цель",
      goal_target: "Цель, слов",
      goal_daily: "В день, слов",
      goal_daily_off: "без дневной цели",
      goal_today: "сегодня",
      goal_save: "Сохранить",
      goal_remove: "Отключить цель",
      goal_done: "цель достигнута",
      goal_of: "из",

      /* ---- import ---- */
      import_btn: "Импорт файла",
      import_chapter_btn: "Импортировать главу",
      import_hint: "TXT · Markdown · HTML",
      import_ok: "Файл импортирован",
      import_err: "Не удалось прочитать файл",
      import_err_type: "Поддерживаются только TXT, Markdown и HTML",

      /* ---- export ---- */
      exp_paper: "Формат",
      exp_section_typeset: "Вёрстка",
      exp_toast_docx_real: "DOCX сохранён",
      exp_err_docx: "Не удалось собрать DOCX",
    },

    en: {
      /* ---- time ---- */
      time_just_now: "just now",
      time_min: "min ago",
      time_h: "h ago",
      time_yesterday: "yesterday",
      time_d: "d ago",

      /* ---- words ---- */
      word_one: "word", word_few: "words", word_many: "words",
      words_written: "written",
      editor_placeholder: "Write…",

      /* ---- plurals ---- */
      proj_one: "project", proj_few: "projects", proj_many: "projects",
      chap_one: "chapter", chap_few: "chapters", chap_many: "chapters",
      note_one: "note",    note_few: "notes",    note_many: "notes",

      /* ---- theme toggle ---- */
      theme_to_dark: "Dark theme", theme_to_light: "Light theme",
      stats_title: "Stats",

      /* ---- topbar ---- */
      topbar_profile: "Profile",

      /* ---- sort ---- */
      sort_btn_title: "Sort",
      sort_header: "Sort by",
      sort_created_desc: "Newest first",
      sort_created_asc: "Oldest first",
      sort_updated: "Recently updated",
      sort_title_asc: "Title · A–Z",

      /* ---- greetings ---- */
      greet_night: "Good night",
      greet_morning: "Good morning",
      greet_day: "Good afternoon",
      greet_evening: "Good evening",

      /* ---- dashboard ---- */
      dash_subtitle: "today?",
      dash_words_total: "words total",
      btn_new_project: "New project",
      btn_new_note: "New note",
      desc_project: "book · chapters",
      desc_note: "single sheet",
      filter_type_label: "type",
      filter_all: "All",
      filter_projects: "Projects",
      filter_notes: "Notes",
      filter_status_label: "status",
      filter_all_status: "All",
      filter_drafts: "Drafts",
      filter_done: "Finished",
      section_projects: "Projects",
      section_notes: "Notes",
      empty_state: "Nothing here yet. Start with a new project.",
      footer_local: "stored locally on this device",
      status_done: "finished",
      status_draft: "draft",
      del_project_title: "Delete project",
      del_note_title: "Delete note",
      empty_note_preview: "empty note",
      project_not_found: "Project not found",
      all_works: "all works",
      synopsis_placeholder: "+ add synopsis",
      words_goal_label: "words · goal",
      mark_done: "finished",
      mark_in_progress: "mark as finished",
      delete_project_btn: "delete project",
      section_chapters: "Chapters",
      add_chapter_btn: "Add chapter",
      no_chapters: "No chapters yet. Create the first one →",
      assemble_book: "Assemble book",
      del_chapter_title: "Delete chapter",
      rename_hint: "Click to rename",
      edit_synopsis_hint: "Click to edit",

      /* ---- confirm delete modal ---- */
      confirm_delete_q: "Delete",
      confirm_delete_body: "This action cannot be undone. All data will be lost.",
      confirm_cancel: "Cancel",
      confirm_delete_btn: "Delete",
      what_project: "project", what_note: "note", what_chapter: "chapter",
      what_all: "all projects, notes and settings",

      /* ---- editor ---- */
      ed_back: "Back",
      ed_rename: "Rename",
      /* ---- updates ---- */
      upd_available: "A new version of Writed is available",
      upd_btn: "Update",
      upd_downloading: "Downloading update",
      upd_done: "Update downloaded",
      upd_open_dmg: "Open the file and drag Writed. into Applications",
      upd_open_apk: "Open the file to install",
      upd_err: "Couldn't download the update",
      upd_retry: "Retry",
      upd_dismiss: "Dismiss",

      ed_link: "Link",
      link_url_placeholder: "https://example.com",
      link_apply: "Apply",
      link_remove: "Remove link",
      mode_edit: "Editor",
      mode_preview: "Preview",
      ed_save: "Save",
      ed_export_book: "Export book",
      ed_export_note: "Export note",
      ed_delete_doc: "Delete document",
      focus_mode_btn: "Focus",
      focus_exit_hint: "Esc — exit focus mode",
      focus_exit_btn: "Exit focus",
      doc_not_found: "Document not found",
      note_label: "Note",
      saved_flash: "saved ✓",
      read_min: "min",

      /* ---- export book modal ---- */
      exp_book_eyebrow: "Assemble book",
      exp_chapters_label: "Chapters",
      exp_of: "of",
      exp_section_structure: "Structure",
      exp_title_page: "Title page",
      exp_toc: "Table of contents",
      exp_merge: "Remove separators between chapters",
      exp_section_layout: "Layout",
      exp_format: "Paper",
      exp_margins: "Margins",
      exp_margin_narrow: "narrow",
      exp_margin_normal: "normal",
      exp_margin_wide: "wide",
      exp_font: "Font",
      exp_leading: "Line spacing",
      exp_err_popup: "Allow pop-ups to print to PDF",
      exp_toast_pdf: "Print window opened — save as PDF",
      exp_toast_pdf_tauri: "Saved for printing — open the file and print to PDF",
      exp_toast_docx: ".doc downloaded — open in Word",
      exp_toast_txt: "Text file downloaded",
      exp_toast_md: "Markdown downloaded",
      toc_title: "Contents",
      preview_label: "preview",

      /* ---- export note modal ---- */
      exp_note_eyebrow: "Export note",
      exp_section_decoration: "Decoration",
      exp_note_title_opt: "Note title",

      /* ---- book preview ---- */
      anchors_show: "Contents",
      anchors_hide: "Hide",
      scroll_top: "Top",

      /* ---- profile ---- */
      toast_avatar: "Photo updated",
      toast_name: "Name saved",
      toast_backup_dl: "Backup downloaded",
      toast_restore_ok: "Data restored",
      toast_restore_err: "Could not read file",
      toast_reset: "Data reset",
      prof_eyebrow: "Profile",
      prof_since: "with us since",
      prof_upload_photo: "Upload photo",
      prof_avatar_alt: "Avatar",
      prof_section_settings: "Settings",
      prof_lbl_name: "Name",
      prof_lbl_theme: "Theme",
      prof_theme_light: "Light",
      prof_theme_dark: "Dark",
      prof_lbl_lang: "Language",
      prof_lbl_tour: "Tour",
      prof_tour_btn: "Replay tour",
      prof_section_data: "Data",
      prof_data_note: "Everything is stored only on this device. Make a backup to avoid losing your work.",
      prof_export_backup: "Export backup (JSON)",
      prof_import_backup: "Import backup",
      prof_reset_btn: "Reset everything",
      prof_back: "home",
      stat_words_written: "words written",
      default_author: "Author",

      /* ---- onboarding ---- */
      onb_steps: "03",
      onb_lang_q: "Choose your language",
      onb_lang_hint: "You can change this in settings",
      onb_lang_continue: "Continue",
      onb_kicker_0: "local · private · yours",
      onb_hero_0_1: "A blank page,",
      onb_hero_0_2: "and nothing",
      onb_hero_0_3: "else",
      onb_lede_0: "Writed· is a writing editor built for the long haul. No cloud, no backend. Your text stays on your device — and only there.",
      onb_cta_0: "Get started",
      onb_kicker_1: "step one",
      onb_q_1: "What should\nwe call you?",
      onb_name_placeholder: "your name",
      onb_hint_1: "the dot grows from your words — you bring it to life",
      onb_kicker_2: "step two",
      onb_q_2: "What light do\nyou write in?",
      onb_theme_light: "Warm paper",
      onb_theme_dark: "Night writing",
      onb_hint_2: "you can always change the theme in settings",
      onb_back: "Back",
      onb_next: "Next",
      onb_finish: "Start writing",

      /* ---- tour ---- */
      tour_intro_eyebrow: "tour · writed",
      tour_intro_title: "A one-minute tour",
      tour_intro_body: "We'll show you the essentials: where projects and notes live, how a book is structured, and what the editor can do. Skip at any time.",
      tour_intro_cta: "Show me",
      tour_dash_eyebrow: "home screen",
      tour_dash_title: "The living dot",
      tour_dash_body: "Writed. always takes you home. A tap on the dot opens your stats — how much you've written in total.",
      tour_create_eyebrow: "where to start",
      tour_create_title: "Projects and notes",
      tour_create_body: "A project is a book with chapters and a word goal. A note is a single sheet for ideas and drafts. Both open in the same editor.",
      tour_filter_eyebrow: "order",
      tour_filter_title: "Drafts and finished",
      tour_filter_body: "The filter hides the clutter — show only what's in progress, or only what's done.",
      tour_card_eyebrow: "your work",
      tour_card_title: "Project card",
      tour_card_body: "Each card shows the number of chapters, words, and progress toward the goal. Let's peek inside a project.",
      tour_proj_eyebrow: "inside a project",
      tour_proj_title: "Edit in place",
      tour_proj_body: "Click the title or synopsis — and type right over it. No manual saving needed.",
      tour_goal_eyebrow: "goal",
      tour_goal_title: "Words and progress",
      tour_goal_body: "The bar tracks progress toward your word goal. You can also mark the project as finished here.",
      tour_chap_eyebrow: "chapters",
      tour_chap_title: "Book structure",
      tour_chap_body: "Add chapters one by one, reorder by dragging the handle on the left. The book is built from them.",
      tour_export_eyebrow: "finale",
      tour_export_title: "Assemble the book",
      tour_export_body: "When the manuscript is ready — export all chapters into one file with a single button.",
      tour_tools_eyebrow: "editor",
      tour_tools_title: "Text tools",
      tour_tools_body: "Headings, quotes, lists and emphasis — everything you need, without visual noise. Same in notes.",
      tour_modes_eyebrow: "two views",
      tour_modes_title: "Editor and preview",
      tour_modes_body: "Switch between the working text and how the chapter will look in the finished book.",
      tour_focus_eyebrow: "silence",
      tour_focus_title: "Full focus",
      tour_focus_body: "This dot hides all UI and leaves only the page. Press Esc to return.",
      tour_count_eyebrow: "calm",
      tour_count_title: "Count and save",
      tour_count_body: "The footer shows your word count and reading time. Text saves itself after every pause.",
      tour_outro_eyebrow: "done",
      tour_outro_title: "A blank page awaits",
      tour_outro_body: "That's all you need to begin. You can replay the tour from your profile at any time.",
      tour_outro_cta: "Start writing",
      tour_skip: "Skip tour",
      tour_back: "Back",
      tour_next: "Next",

      /* ---- app ---- */
      app_splash_sub: "a writer's editor",
      toast_project_created: "Project created",
      default_project_title: "New project",
      default_note_title: "New note",

      /* ---- search ---- */
      search_title: "Search",
      search_btn: "Search",
      search_placeholder: "Search chapters and notes…",
      search_placeholder_project: "Search in this project…",
      search_hint: "Enter to open · Esc to close",
      search_empty: "Nothing found",
      search_start: "Type to search",
      search_in_title: "in title",
      search_synopsis: "synopsis",
      search_results_n: "results",

      /* ---- undo / redo ---- */
      ed_undo: "Undo",
      ed_redo: "Redo",

      /* ---- snapshots ---- */
      snap_title: "Versions",
      snap_btn: "Chapter versions",
      snap_save: "Save version",
      snap_saved: "Version saved",
      snap_empty: "No versions yet",
      snap_restore: "Restore",
      snap_delete: "Delete version",
      snap_deleted: "Version deleted",
      snap_restored: "Version restored",
      snap_auto_name: "before restore",
      snap_confirm_title: "Restore this version?",
      snap_confirm_body: "The current text is kept as its own version, so you can always go back.",
      snap_confirm_ok: "Restore",
      snap_name_placeholder: "Version name (optional)",
      snap_limit: "The last 30 versions are kept",

      /* ---- goals ---- */
      goal_title: "Goal",
      goal_set: "Set a goal",
      goal_edit: "Edit goal",
      goal_target: "Target words",
      goal_daily: "Words per day",
      goal_daily_off: "no daily goal",
      goal_today: "today",
      goal_save: "Save",
      goal_remove: "Turn goal off",
      goal_done: "goal reached",
      goal_of: "of",

      /* ---- import ---- */
      import_btn: "Import file",
      import_chapter_btn: "Import chapter",
      import_hint: "TXT · Markdown · HTML",
      import_ok: "File imported",
      import_err: "Could not read the file",
      import_err_type: "Only TXT, Markdown and HTML are supported",

      /* ---- export ---- */
      exp_paper: "Paper",
      exp_section_typeset: "Typesetting",
      exp_toast_docx_real: "DOCX saved",
      exp_err_docx: "Could not build the DOCX",
    },
  };

  function t(key, lang) {
    const dict = STRINGS[lang] || STRINGS.ru;
    return (key in dict) ? dict[key] : ((key in STRINGS.ru) ? STRINGS.ru[key] : key);
  }

  /* returns a bound translator for a given lang */
  function T(lang) {
    return (key) => t(key, lang);
  }

  /* pluralise for lang */
  function pluralT(n, lang, oneKey, fewKey, manyKey) {
    if (lang === "en") {
      return n === 1 ? t(oneKey, lang) : t(manyKey, lang);
    }
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return t(oneKey, lang);
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return t(fewKey, lang);
    return t(manyKey, lang);
  }

  function wordsLabelT(n, lang) {
    return n + " " + pluralT(n, lang, "word_one", "word_few", "word_many");
  }

  function timeAgoT(ts, lang) {
    const d = Date.now() - ts, m = 60000, h = 3600000, day = 86400000;
    if (d < m)   return t("time_just_now", lang);
    if (d < h)   return Math.floor(d / m) + " " + t("time_min", lang);
    if (d < day) return Math.floor(d / h) + " " + t("time_h", lang);
    if (d < day * 2) return t("time_yesterday", lang);
    if (d < day * 30) return Math.floor(d / day) + " " + t("time_d", lang);
    const locale = lang === "en" ? "en-US" : "ru-RU";
    return new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "short" });
  }

  Object.assign(window, { t, T, pluralT, wordsLabelT, timeAgoT });
})();
