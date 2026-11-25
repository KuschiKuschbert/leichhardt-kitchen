# Device coverage: every pull request that changed what people see

The evidence list behind [device-coverage.md](../device-coverage.md). One row for each merged pull request that changed a file the book draws with (`index.html`, `css/`, or `js/` other than the recipe data `js/data.js`, `js/overlay.js` and `js/art.js`), newest first. Built on 26 November 2026 from the 861 merged pull requests up to #887 (857 matched to their commit on `main`, 4 not), with the commands in [How it was made](../device-coverage.md#how-it-was-made).

**Named** means the pull request text names that width (for example "at 390 px" or "1280 x 900"). It is not proof it was measured, and leaving a width out is not proof it was missed. Breakpoints ("from 768 px"), heights and the pull request template's own notes are not counted. Phone is under 600 px, tablet 600 to 1099, laptop 1100 to 1599, section screen 1600 and over. **Words** marks text that talks about wide, kitchen or section screens or desktop without a section-screen width. Pages are read from the title and the files, so they are approximate.

| PR | Merged | Pages | Phone | Tablet | Laptop | Section screen | Words | Widths named |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #884 A shared kitchen screen can be set to one section for Cleaning | 26 Nov | Cleaning | yes |  |  |  | yes | 390 |
| #881 Cleaning opens on the cook's own section today | 26 Nov | Cleaning | yes |  |  |  | yes | 390 |
| #880 Cleaning: the head chef's section jobs, and each job says how often | 25 Nov | Cleaning | yes | yes | yes |  | yes | 390, 768, 1280 |
| #871 Home keeps its cards on the first repaint, and the seasonal Home at rest check stops fa... | 25 Nov | Functions, Home |  |  |  |  | yes |  |
| #870 Print cards answers a tap at once and lays the cards out after it | 25 Nov | Recipes |  |  |  |  |  |  |
| #867 Order day: a line in Your day reminds the chef on to do the supplier orders | 24 Nov | Orders, Suppliers and cut-offs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #866 Cleaning and Records read a day with one shared piece of code | 24 Nov | Admin and chef panel, Cleaning |  |  |  |  |  |  |
| #864 The Export menu on a report stays open when the page redraws | 24 Nov | Admin and chef panel |  |  |  |  |  |  |
| #860 Opening Prep no longer flashes the read-only notice between two Loading cards | 24 Nov | Prep |  |  |  |  |  |  |
| #857 The loading card says what it is doing, and its rows breathe on a long wait | 24 Nov | Other | yes |  |  |  |  | 390 |
| #856 Opening the book no longer loads twice after an update | 24 Nov | Other |  |  |  |  |  |  |
| #851 The prep, order and wastage lists open sooner when the app first starts | 24 Nov | Prep, Wastage |  |  |  |  |  |  |
| #847 The owner gets Admin at a second venue with his own PIN, and his profile is locked for... | 24 Nov | Admin and chef panel, Sign in and lock | yes |  |  |  |  | 390 |
| #843 A phone shows the venue's name under the KB mark | 24 Nov | Other | yes | yes | yes |  |  | 360, 390, 768, 1280 |
| #841 Cut-off pushes promise an hour before again: Google's timer runs them on time | 24 Nov | Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #837 Keep Find focused when the panel refreshes | 24 Nov | Other | yes | yes |  |  |  | 390, 768 |
| #835 Reopen a dated Wastage draft from today’s review after midnight | 23 Nov | Wastage | yes | yes | yes |  |  | 390, 768, 1280 |
| #834 Show when a new chef job is still sending | 24 Nov | Other | yes |  | yes |  |  | 390, 1280 |
| #833 Make Home alerts, Settings values and the chef hat easier to use | 24 Nov | Admin and chef panel, Home, Settings | yes |  |  |  |  | 320, 390 |
| #832 Keep recipe keyboard focus and clarify editor and empty-book states | 24 Nov | Recipe editor and drawings, Recipes | yes |  | yes |  |  | 390, 1280 |
| #831 Count Functions trips as waiting after the send is confirmed | 24 Nov | Functions | yes |  | yes |  |  | 390, 1280 |
| #830 Show Minutes signing progress and retry a failed sign-off check | 24 Nov | Minutes | yes |  | yes |  |  | 390, 1280 |
| #829 Keep the Transfer logging sheet within narrow screens | 24 Nov | Shared controls and sheets, Transfers | yes |  |  |  |  | 320 |
| #828 Show Cleaning progress on the action you pressed | 24 Nov | Cleaning |  |  |  |  |  |  |
| #827 Give Home Functions a clear retry status | 24 Nov | Functions, Home |  |  |  |  | yes |  |
| #826 Keep the caret in Supplier Order and Catalogue search | 24 Nov | Shared controls and sheets, Suppliers and cut-offs |  |  |  |  |  |  |
| #825 Keep keyboard focus with Find in the admin and chef panels | 24 Nov | Admin and chef panel | yes | yes | yes |  |  | 390, 768, 1280 |
| #824 Clear a Prep tick on your other screen after its pause | 23 Nov | Prep |  |  |  |  | yes |  |
| #823 Keep narrow phone tabs easy to tap | 23 Nov | Top bar and tabs | yes |  |  |  |  | 320, 360, 390 |
| #822 Keep keyboard focus inside function sheets and Guide videos | 23 Nov | Functions, Guides, Shared controls and sheets | yes | yes | yes |  |  | 390, 768, 1280 |
| #821 Keep pending transfer returns in Still out | 23 Nov | Transfers | yes | yes | yes |  |  | 390, 768, 1280 |
| #819 Keep the PIN keyboard quiet in the background | 23 Nov | Sign in and lock |  |  |  |  |  |  |
| #815 Keep Supplier History actions on the selected order | 23 Nov | Suppliers and cut-offs | yes |  | yes |  |  | 390, 1280 |
| #814 Keep incomplete reports from exporting as complete | 23 Nov | Admin and chef panel | yes |  | yes |  |  | 390, 1280 |
| #813 Protect newer wastage reviews when saving | 23 Nov | Wastage | yes |  | yes |  | yes | 390, 1280 |
| #812 Show checked and unchecked allergens on plate pins | 23 Nov | Recipes | yes | yes | yes |  | yes | 320, 390, 768, 1280 |
| #811 Put Booking contact beside the function facts | 23 Nov | Functions | yes |  |  |  | yes | 390 |
| #810 Keep routine Functions folded on Orders | 23 Nov | Functions, Orders | yes | yes | yes |  |  | 390, 768, 1280 |
| #809 Bring Supplier order entry beside its status | 23 Nov | Suppliers and cut-offs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #808 Bring Wastage History entries higher | 23 Nov | Wastage | yes |  |  |  | yes | 390 |
| #807 Bring the first Records date into view on desktop | 23 Nov | Admin and chef panel | yes | yes | yes |  | yes | 390, 768, 1280 |
| #806 Fit Recipe filters closer to the results | 23 Nov | Recipes | yes | yes | yes |  |  | 390, 768, 1280 |
| #805 Jump from a video guide to that video’s links | 23 Nov | Guides | yes | yes |  |  | yes | 390, 800 |
| #804 Fit another Prep tick above Add on busy phones | 23 Nov | Prep | yes | yes | yes |  |  | 360, 390, 768, 1280 |
| #803 Keep the phone People roster in place during an update | 23 Nov | Admin and chef panel, Today's team | yes |  |  |  |  | 390 |
| #802 Jump to finished Orders and Transfers | 23 Nov | Orders, Transfers |  |  |  |  |  |  |
| #801 Keep Manage Functions search beside status on desktop | 23 Nov | Functions, Shared controls and sheets |  |  |  |  | yes |  |
| #800 Jump to tutorial link editing and Save | 23 Nov | Other |  |  |  |  |  |  |
| #799 Show both pages of a short guide together | 23 Nov | Guides |  |  |  |  |  |  |
| #798 Keep recipe ingredient details beside the list | 23 Nov | Recipe editor and drawings, Recipes |  | yes | yes |  | yes | 768, 800, 1280 |
| #797 Make Shift pings shorter and name the right recipient | 23 Nov | Pings, Today's team | yes |  |  |  |  | 390 |
| #796 Make more room for the team roster | 23 Nov | Today's team | yes |  |  |  | yes | 390 |
| #794 Bring the Prep Before service tools onto one row | 23 Nov | Prep | yes | yes | yes |  |  | 390, 768, 1280 |
| #793 Keep delivery readings and receipts in view | 23 Nov | Deliveries | yes |  |  |  | yes | 390 |
| #792 Jump to sign-off in the meeting minutes | 23 Nov | Minutes | yes |  |  |  |  | 390 |
| #791 Jump to the pack-down list from Cleaning | 23 Nov | Cleaning | yes | yes | yes |  |  | 390, 768, 1280 |
| #790 Show Inbox priorities before the detailed mail | 23 Nov | Admin and chef panel, Mail |  |  |  |  | yes |  |
| #788 Bring the Wastage review into the opening screen | 22 Nov | Wastage | yes | yes | yes |  | yes | 390, 768, 1280 |
| #787 Jump straight to delivery records on a phone | 22 Nov | Admin and chef panel, Deliveries | yes | yes |  |  | yes | 320, 390, 720 |
| #786 Keep waiting trips beside the next Functions rounds on desktop | 22 Nov | Functions |  |  |  |  | yes |  |
| #785 Keep a failed Prep tick visible and make both Undo actions readable | 22 Nov | Prep |  |  |  |  |  |  |
| #784 Keep order requests beside supplier cut-offs on wide screens | 22 Nov | Orders, Suppliers and cut-offs | yes | yes | yes |  | yes | 320, 390, 768, 1280 |
| #783 Make the People roster easier to scan and edit | 23 Nov | Admin and chef panel, Today's team | yes | yes | yes |  | yes | 320, 390, 600, 768, 1000, 1280 |
| #782 Suggest supplier order amounts from weekly sales | 22 Nov | Suppliers and cut-offs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #781 Tap a person's name to edit them in People | 22 Nov | Other | yes | yes | yes |  |  | 390, 768, 900, 1280 |
| #780 Show the full CSV roster hours in Today's team | 22 Nov | Today's team |  |  |  |  |  |  |
| #779 One orange main button, one red for Remove and Discard, and chosen chips in ink | 20 Nov | Admin and chef panel, Cleaning, Deliveries, Functions, Recipe editor and drawings | yes | yes | yes |  |  | 390, 768, 1280 |
| #778 Every search is the Recipes pill, every Save bar has one frame, and a function's Save s... | 20 Nov | Functions, Recipe editor and drawings, Recipes, Shared controls and sheets, Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #776 Orders steps its day like Prep and its words tick a line, Transfers counts what is stil... | 20 Nov | Cleaning, Orders, Prep, Recipe editor and drawings, Recipes, Transfers | yes | yes | yes |  |  | 390, 768, 1280 |
| #774 A page that could not load says so the same way everywhere, with Try again | 20 Nov | Cleaning, Deliveries, Functions, Recipe editor and drawings, Suppliers and cut-offs |  |  |  |  |  |  |
| #773 Prep opens with the functions on one slim line and keeps your place when you come back | 20 Nov | Functions, Prep | yes |  |  |  |  | 390 |
| #772 The head chef can plan prep lines for tomorrow, and tonight's list says when a line is... | 19 Nov | Prep | yes |  |  |  |  | 390 |
| #771 Save delivery is on the first phone screen, Orders puts Remove before the menu, and the... | 20 Nov | Deliveries, Functions, Orders | yes | yes | yes |  |  | 390, 768, 1280 |
| #770 The People page reads first: one row a person, Change opens them in place | 19 Nov | Admin and chef panel | yes | yes | yes |  |  | 375, 390, 768, 1280 |
| #767 AVC Live cards can be read into recipe drafts, ready for the second venue's empty book | 24 Nov | Recipes |  |  |  |  |  |  |
| #765 The head chef can delete a person for good from the Team room | 19 Nov | Today's team | yes |  |  |  |  | 390 |
| #763 A recipe whose allergens nobody checked says so, and Free from leaves it out | 19 Nov | Functions, Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #762 Guides previews play only under a mouse, never on a phone or tablet | 19 Nov | Guides |  |  |  |  |  |  |
| #760 Chefs can print paper recipe cards, from Manage Recipes or from a recipe | 19 Nov | Functions, Recipe editor and drawings, Recipes | yes | yes | yes |  |  | 390, 768, 1280 |
| #759 The tutorial videos in Guides get moving previews on their cards and pages | 19 Nov | Guides | yes | yes | yes |  | yes | 390, 640, 768, 1280 |
| #757 Guides plays the tutorial videos: staff ones for everyone, the chefs' ones for chefs an... | 19 Nov | Admin and chef panel, Guides | yes | yes | yes |  | yes | 390, 768, 1280 |
| #755 A round time set by hand on a function stays when the rounds change | 18 Nov | Functions | yes |  | yes |  |  | 390, 1280 |
| #754 A function's order line opens to what its platters need | 18 Nov | Functions | yes | yes | yes |  |  | 390, 768, 1280 |
| #753 Function times are typed and never guessed, with a list of times on a laptop | 18 Nov | Functions | yes |  | yes |  |  | 390, 1280 |
| #750 The head chef can put prep lines on a later day, and the rollover no longer loses lines... | 18 Nov | Prep | yes | yes | yes |  |  | 390, 768, 1280 |
| #749 April Fools starts at 04:00, not midnight, and remembers which joke each person got | 18 Nov | April Fools |  |  |  |  |  |  |
| #748 Home shows each person's whole roster day, and the whole day lists who starts when, wit... | 18 Nov | Home, Today's team | yes | yes |  |  |  | 390, 900 |
| #747 New Year's Eve and New Year's Day: Home bursts into fireworks and the cards and icons d... | 17 Nov | Home, Seasonal | yes |  | yes |  | yes | 390, 1280 |
| #746 The mascot wears a festive hat on Home, and Coming up counts down to Christmas | 17 Nov | Home, Mascot, Seasonal | yes |  | yes |  | yes | 390, 1280 |
| #745 April Fools on Home: 24 jokes on 1 April, once a year per person on any device, with a... | 17 Nov | Admin and chef panel, April Fools, Home | yes | yes | yes |  |  | 390, 768, 1280 |
| #744 Supplier orders say which delivery they are for in green, and a late tick counts for th... | 17 Nov | Deliveries, Orders, Suppliers and cut-offs | yes |  |  |  |  | 360, 390 |
| #743 Today's team: a Rostered hours label under each name, so the hours stand out while you... | 17 Nov | Today's team | yes | yes | yes |  |  | 320, 390, 768, 1280 |
| #741 The mascot says the welcome on Home, and today's prep list can finish while tomorrow's... | 17 Nov | Home, Mascot, Prep | yes |  |  |  | yes | 390 |
| #740 All day takes the cook's Lunch section, or their Dinner section with no Lunch | 17 Nov | Other |  |  |  |  |  |  |
| #738 Guides has Steamed veg on the iCombi: steam at 100 °C, all in at the ready beep, brocco... | 17 Nov | Guides | yes | yes | yes |  |  | 390, 768, 1280 |
| #736 Today's team: one break per person for the whole day, with an optional 2nd break | 17 Nov | Today's team | yes | yes | yes |  |  | 390, 768, 1280 |
| #724 On break now sits at the top of Today's team on every phone, so short phones show every... | 16 Nov | Today's team | yes | yes |  |  |  | 320, 360, 375, 390, 412, 768 |
| #723 Today's team says too few in an amber band, and a head chef or sous chef can accept it... | 16 Nov | Today's team | yes |  |  |  |  | 360, 375, 390 |
| #722 Every name on the On break now board shows above the Save bar on the head chef's phone | 16 Nov | Shared controls and sheets, Today's team | yes | yes | yes |  |  | 320, 360, 390, 720, 768, 1280 |
| #721 Today's team on one clock: each person's day as a bar, sections and breaks in their row... | 16 Nov | Today's team | yes | yes | yes |  |  | 320, 390, 768, 1280 |
| #720 Keep long amounts and recipe titles clear of controls | 16 Nov | Recipes | yes | yes | yes |  | yes | 360, 390, 768, 1280 |
| #719 Keep transfer loan cards inside the phone screen | 16 Nov | Transfers | yes | yes | yes |  |  | 360, 390, 768, 1280 |
| #718 Today's team runs in time order, keeps breaks inside each person's hours, flags anyone... | 16 Nov | Today's team | yes |  | yes |  |  | 390, 1280 |
| #717 The kitchen tablet's Home button goes Home without reloading the book | 16 Nov | Home | yes |  |  |  |  | 390 |
| #716 Swipe smoothly between the main pages | 16 Nov | Shared controls and sheets | yes | yes | yes |  | yes | 390, 768, 1280 |
| #715 Draw it for me lays plates out like the book's own and draws what the recipe's plating... | 15 Nov | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #714 The chef panel's Kitchen room is rows that open each tool, Home no longer lights Prep,... | 15 Nov | Admin and chef panel, Home, Prep, Recipe editor and drawings, Recipes, Suppliers and cut-offs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #713 Today's team warns when too few are on at a busy time | 15 Nov | Today's team | yes | yes | yes |  |  | 390, 768, 1280 |
| #712 Roster hours are saved with the day's plan, so everyone on the day sees who comes in when | 15 Nov | Today's team | yes |  |  |  |  | 390 |
| #711 Today's team hides a shift like Smoker until someone is on it | 15 Nov | Today's team | yes | yes | yes |  |  | 390, 768, 1280 |
| #710 Today's team suggests "Often" sections from the last 30 days, and old counts suggest no... | 15 Nov | Today's team | yes |  |  |  |  | 390 |
| #709 Today's team: give staff their sections in a day grid, one picker per service | 15 Nov | Shared controls and sheets, Today's team | yes |  |  |  |  | 390 |
| #708 Suggestions forgive a slip on Prep, Orders, Wastage and Transfers | 15 Nov | Orders, Prep, Transfers, Wastage | yes |  |  |  |  | 390 |
| #707 Swiping a sheet down works from its top edge, a quick flick closes it, and so does a pu... | 15 Nov | Shared controls and sheets | yes |  | yes |  | yes | 390, 1280 |
| #706 Signed out on a tablet or laptop, the Recipes docket lines up under a celebration note | 15 Nov | Recipes, Seasonal | yes | yes | yes |  |  | 390, 720, 768, 1280 |
| #705 Signing in: a clear start screen, and back to your own page later the same day | 15 Nov | Sign in and lock | yes |  | yes |  | yes | 390, 1280 |
| #703 Today's team: next week keeps the date list open, and the team tests pass on a Sunday | 15 Nov | Today's team |  |  |  |  |  |  |
| #702 A function's leftover prep and order lines come off once it is all sent | 15 Nov | Functions, Prep | yes |  |  |  |  | 390 |
| #701 Roster names can be linked to nicknames in the book, privately for the head chef | 14 Nov | Today's team |  |  |  |  |  |  |
| #700 Functions service: the kitchen sends platters in trips, and Functions confirms each one | 14 Nov | Functions | yes | yes | yes |  |  | 390, 768, 1280 |
| #699 Head chef can fill Today's team from the Humanforce roster file in the admin panel | 14 Nov | Admin and chef panel, Today's team | yes |  |  |  |  | 390 |
| #698 Recipes can keep the phone screen on: one tap on Keep screen on | 14 Nov | Recipes | yes |  |  |  |  | 320, 390 |
| #695 Orders says when a request is already on the list, and Records keeps each day's cooling... | 14 Nov | Admin and chef panel, Cooling clock, Orders | yes |  |  |  |  | 390 |
| #694 A person's page shows their shifts by section | 14 Nov | Today's team | yes |  | yes |  |  | 390, 1280 |
| #693 A renamed kitchen section keeps its history | 14 Nov | Admin and chef panel | yes |  |  |  |  | 390 |
| #691 Wastage fills what the book knows, and Reports has one Records page for each kitchen day | 14 Nov | Admin and chef panel, Wastage | yes | yes | yes |  |  | 390, 768, 1280 |
| #689 No signal only when there is no signal, and the head chef has one name on screen | 14 Nov | Other | yes |  |  |  |  | 390 |
| #688 23 bugs fixed: allergens kept on save, removed order lines stay removed, lists recover... | 14 Nov | Cleaning, Deliveries, Functions, Recipe editor and drawings, Recipes, Suppliers and cut-offs |  |  |  |  |  |  |
| #687 Not me works on a locked screen once the last change is sent | 14 Nov | Sign in and lock |  |  |  |  |  |  |
| #686 The book updates quietly: no band offers a new version | 13 Nov | Other | yes |  |  |  |  | 390 |
| #683 Reports, Team opens with At a glance: its findings as cards | 12 Nov | Admin and chef panel, Today's team |  |  | yes |  |  | 1280 |
| #681 Reports say "Everyone" and "All sections", not "All person" | 12 Nov | Admin and chef panel |  |  |  |  |  |  |
| #680 The recipe editor and function form use the book's one two-tap helper | 12 Nov | Functions, Recipe editor and drawings, Recipes |  |  |  |  | yes |  |
| #678 A finished section on a wide screen says what is left in green too | 12 Nov | Other |  |  |  |  | yes |  |
| #677 Wide screens say a finished section large, with the mascot under his words | 11 Nov | Mascot | yes | yes |  | yes |  | 390, 900, 1920 |
| #673 The slip says when a section is finished | 11 Nov | Other | yes | yes | yes |  |  | 390, 768, 1280 |
| #672 Chefs can see who has said Got it to a function | 10 Nov | Functions | yes |  |  |  |  | 390 |
| #671 The mascot cheers a finished prep list | 10 Nov | Mascot, Prep | yes |  |  |  |  | 390 |
| #669 Home tells each person about a function once, under Your day | 10 Nov | Functions, Home | yes | yes | yes |  | yes | 390, 720, 1100 |
| #668 Orders says Order today, then Not ordered yet, on a function's stock line | 10 Nov | Functions, Orders | yes |  |  |  |  | 390 |
| #667 The next function shows on every work page all week | 10 Nov | Functions | yes | yes | yes |  |  | 390, 768, 1280 |
| #666 No more written assessments: cross-training from shifts worked, and a calmer admin Inbo... | 10 Nov | Admin and chef panel, Today's team | yes |  | yes |  |  | 390, 1280 |
| #665 Drinks run counts one drink each: the coffee, or the soft drink | 10 Nov | Drinks |  |  |  |  |  |  |
| #664 Prep's Start here drops its confusing times; the head chef sees how long jobs take from... | 10 Nov | Prep | yes |  |  |  |  | 390 |
| #661 Home welcome follows the time of day and your shift, and the mascot stays visible | 10 Nov | Home, Mascot, Seasonal, Today's team | yes |  |  |  |  | 390 |
| #660 Home greets each person with the kitchen mascot's action of the day | 10 Nov | Home, Mascot |  |  |  |  |  |  |
| #659 The first PIN of a person's day opens Home | 10 Nov | Home, Sign in and lock | yes |  |  |  |  | 390 |
| #658 On today on Home is a small section board, not a long list | 10 Nov | Home | yes | yes | yes |  | yes | 390, 768, 1280 |
| #655 Reset Operandio at 21:00 and reopen manual starts at 10:00 | 10 Nov | Cooling clock | yes | yes | yes |  | yes | 390, 768, 1280 |
| #653 Clear Operandio reminders for everyone after recording | 10 Nov | Cooling clock | yes | yes | yes |  |  | 390, 768, 1280 |
| #652 Keep each person's service and section together in Today's team | 10 Nov | Today's team | yes |  |  |  |  | 390 |
| #650 Keep team date labels inside narrow screens | 10 Nov | Today's team | yes | yes | yes |  |  | 320, 390, 768, 1280 |
| #649 Welcome staff by name and keep their identity consistent | 10 Nov | Home | yes |  | yes |  | yes | 390, 1440 |
| #647 Make team and timer icons tilt in the top bar | 10 Nov | Today's team, Top bar and tabs |  |  |  |  |  |  |
| #645 Show only the staff selected for the planning day | 09 Nov | Other | yes |  |  |  |  | 390 |
| #642 Keep order requests together with compact supplier cut-offs | 10 Nov | Orders, Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #639 Use a person worksheet with quick staff entry and overlapping breaks | 09 Nov | Shared controls and sheets, Today's team | yes | yes | yes |  | yes | 390, 768, 1280 |
| #638 Keep chef Cleaning lists compact and edit one task at a time | 09 Nov | Cleaning |  |  |  |  | yes |  |
| #637 Add checked cleaning schedules and ordered pack down | 09 Nov | Cleaning | yes |  |  |  | yes | 390 |
| #636 Replace supplier template lists and archive missing products | 09 Nov | Suppliers and cut-offs | yes | yes | yes |  |  | 390, 768, 1280 |
| #635 Simplify Today's team with one roster and hide an empty break board | 09 Nov | Today's team | yes | yes | yes |  | yes | 390, 768, 1280 |
| #632 Use consistent colours across books, blocks and banners | 09 Nov | Other | yes | yes | yes |  |  | 390, 768, 1280 |
| #631 Import into existing supplier catalogues and show the result | 09 Nov | Suppliers and cut-offs | yes | yes | yes |  |  | 390, 768, 1280 |
| #630 Plan staff sections ahead from Today's team | 09 Nov | Today's team | yes | yes | yes |  |  | 390, 768, 1280 |
| #629 Give every sheet and modal the same frame and close controls | 09 Nov | Seasonal, Shared controls and sheets | yes |  |  |  |  | 390 |
| #627 Label supplier purchases as Latest or Earlier order | 09 Nov | Suppliers and cut-offs | yes | yes | yes |  | yes | 320, 390, 768, 1280 |
| #626 Show each supplier item's last ordered date and quantity | 09 Nov | Suppliers and cut-offs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #625 Keep completed cooling timers disabled until tomorrow | 09 Nov | Cooling clock | yes | yes | yes |  |  | 390, 768, 1280 |
| #624 Show current breaks on a charcoal board and order shift tabs | 09 Nov | Today's team, Top bar and tabs | yes | yes | yes |  | yes | 320, 390, 768, 1280 |
| #623 Follow new supplier templates and separate delivery schedules | 09 Nov | Deliveries, Suppliers and cut-offs | yes |  |  |  | yes | 390 |
| #622 Colour code the Home team and prep cards | 09 Nov | Home, Prep, Today's team | yes | yes | yes |  | yes | 390, 768, 1280 |
| #621 Distinguish Now and next and slim desktop celebrations | 09 Nov | Seasonal | yes | yes | yes |  | yes | 390, 768, 1280, 1440 |
| #620 Show a close button on sheets and modals for mouse users | 09 Nov | Shared controls and sheets | yes | yes | yes |  |  | 390, 768, 1280 |
| #619 Give desktop Home aligned cards and calmer spacing | 09 Nov | Home | yes | yes |  |  | yes | 390, 768 |
| #618 Show section, break and coworkers first on Home | 09 Nov | Home, Today's team | yes | yes | yes |  | yes | 390, 768, 1280 |
| #617 Show the KB logo in the mobile header | 09 Nov | Other | yes |  |  |  |  | 360, 375, 390, 430 |
| #616 Close sheets and modals with a downward swipe | 09 Nov | Shared controls and sheets | yes | yes | yes |  |  | 390, 768, 1280 |
| #615 Show Operandio progress in the clock and repeat its chime | 09 Nov | Cooling clock | yes | yes | yes |  | yes | 390, 720, 768, 1100, 1280 |
| #614 Let admin turn on Cleaning after setup | 08 Nov | Admin and chef panel, Cleaning | yes |  |  |  | yes | 390 |
| #613 Add shared Operandio cooling timers for logged-in screens | 08 Nov | Cooling clock | yes |  |  |  |  | 390 |
| #612 Add chef-owned prep standards with admin rollout | 09 Nov | Admin and chef panel, Prep | yes | yes | yes |  |  | 390, 768, 1280 |
| #609 Add kitchen cleaning checklist and chef week review; move Guides into the hat | 08 Nov | Cleaning, Guides | yes | yes | yes |  |  | 390, 768, 1280 |
| #608 Make Wall board available to all Prep accounts | 08 Nov | Prep | yes | yes | yes |  | yes | 390, 768, 1280 |
| #607 Give head chef and sous chefs a panel using the admin layout | 08 Nov | Admin and chef panel | yes | yes | yes |  |  | 390, 768, 1280 |
| #605 Give Drinks run the matching notebook style | 08 Nov | Drinks | yes |  |  |  |  | 390 |
| #604 Show staff who is on today from Home | 08 Nov | Home | yes |  |  |  |  | 390 |
| #602 Apply book colours to Chef to-do and Today's team | 08 Nov | Chef to-do, Today's team | yes |  |  |  |  | 390 |
| #601 Restyle Today’s team as a section-first notebook with saved breaks | 08 Nov | Today's team | yes | yes | yes |  | yes | 320, 390, 768, 1280 |
| #600 Make Chef to-do a responsive open notebook | 08 Nov | Chef to-do | yes |  |  |  |  | 390 |
| #598 The redesign's gaps from the screen check: more prep lines, Home's week ahead and team,... | 08 Nov | Admin and chef panel, Deliveries, Functions, Home, Prep, Today's team | yes |  |  |  |  | 360, 390 |
| #597 Home shows today's next order cut-off from the morning, quiet until its reminder starts | 08 Nov | Home, Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #596 The admin panel opens on an Inbox with today's numbers, the Dashboard sits beside it, a... | 08 Nov | Admin and chef panel | yes | yes | yes |  |  | 390, 768, 1280 |
| #595 The chef hat is a list of the day's jobs, and pings, the to-do, drinks, minutes, mail,... | 08 Nov | Admin and chef panel, Chef to-do, Drinks, Guides, Mail, Minutes, Pings, Today's team | yes | yes | yes |  |  | 390, 768, 1280 |
| #594 Recipes search is one pill with Contains or Free from, and a recipe card's jump row sta... | 08 Nov | Recipes, Shared controls and sheets | yes |  |  |  |  | 390 |
| #593 Functions read as Today and Upcoming, Cancel sits at the end of the card, and the servi... | 08 Nov | Functions | yes | yes | yes |  |  | 390, 768, 1280 |
| #592 Wastage entries read in two lines with the reason first, and loans on Transfers are car... | 08 Nov | Transfers, Wastage | yes | yes | yes |  |  | 390, 768, 1280 |
| #591 Orders read like a departure board by supplier, the cut-off bar matches Home, and deliv... | 08 Nov | Deliveries, Home, Orders, Suppliers and cut-offs | yes |  |  |  |  | 360, 390 |
| #590 Home shows the day's now and next: what is due, each section's progress and what is com... | 08 Nov | Functions, Home, Seasonal | yes | yes | yes |  |  | 390, 768, 1280 |
| #589 Prep lines fit on one row on a phone, Urgent is one tap with its word, and the wall boa... | 08 Nov | Prep | yes |  | yes |  | yes | 360, 390, 1280 |
| #578 A past wastage fix names its day, so the nightly reports and backup have it the next mo... | 07 Nov | Admin and chef panel, Wastage |  |  |  |  |  |  |
| #576 Today's team: split shifts, chefs take a section, and the plans count for training | 08 Nov | Admin and chef panel, Today's team | yes |  |  |  |  | 360, 390 |
| #574 Manage functions follows other phones' changes without reading every booking again | 07 Nov | Functions |  |  |  |  |  |  |
| #573 Today's team: chefs set shifts, sections and breaks, and staff see their day | 07 Nov | Admin and chef panel, Today's team | yes | yes | yes |  |  | 360, 375, 390, 720, 768, 1280 |
| #572 The admin unlock, sections and functions list read less, and Move PIN cannot use up the... | 07 Nov | Admin and chef panel, Functions, Sign in and lock, Suppliers and cut-offs |  |  |  |  |  |  |
| #568 The recipe and drawing editors keep a failure up in red until OK, and a save names what... | 06 Nov | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #566 The Review desk and proofreader say their outcome on the slip, and a mail moved to anot... | 06 Nov | Admin and chef panel, Mail | yes |  |  |  |  | 390 |
| #565 The book reads past days from the nightly records, so the free reads last the day | 06 Nov | Admin and chef panel |  |  |  |  |  |  |
| #563 After an update nobody asked for, the admin panel reopens on the Dashboard | 05 Nov | Admin and chef panel |  |  |  |  |  |  |
| #561 Ticking a mail or to-do job off says so with Undo, and Refresh says when it read | 05 Nov | Chef to-do, Mail | yes |  |  |  |  | 390 |
| #560 A supplier catalogue save lands back on the item's row with a Saved 14:02 stamp | 05 Nov | Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #559 The book says when today's free reads are used up, and open screens reload less | 05 Nov | Functions, Suppliers and cut-offs |  |  |  |  |  |  |
| #558 A failed function save says Try again by its button, and a refused Sent tick says so in... | 05 Nov | Functions | yes |  |  |  |  | 390 |
| #557 The add sheets say "Added just now" under the box, with Undo, instead of a slip over th... | 05 Nov | Shared controls and sheets | yes |  |  |  |  | 390 |
| #556 Supplier order opens when one saved supplier cannot be read, and says which | 05 Nov | Suppliers and cut-offs | yes |  | yes |  |  | 390, 1280 |
| #555 Slips name the line, Undo says what it undid, and new lines wear New 14:02 | 05 Nov | Other | yes |  |  |  |  | 390 |
| #554 A supplier ticked on the order list first can still have its order recorded | 05 Nov | Orders, Suppliers and cut-offs |  |  |  |  |  |  |
| #553 Saving the cut-offs or a recipe says Saved, with a Saved 14:02 stamp on what changed | 05 Nov | Recipe editor and drawings, Recipes, Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #552 Suppliers can close on their own day for each delivery, with a heads-up the day before | 05 Nov | Deliveries, Suppliers and cut-offs | yes | yes | yes |  |  | 390, 768, 1280 |
| #551 Settings rows alternate with a light tint, so the eye keeps to its row | 05 Nov | Settings | yes |  | yes |  |  | 390, 412, 1280 |
| #549 Ticking prep is one tap again; I'm on it is its own On it button on each line | 05 Nov | Prep | yes |  |  |  |  | 390 |
| #548 A sous chef's Manage staff, Shift pings and minutes use the full width on a laptop; old... | 05 Nov | Admin and chef panel, Minutes, Pings, Today's team | yes | yes | yes |  |  | 360, 390, 600, 768, 1100, 1280 |
| #547 Kitchen sections, Pages staff see and top tickers open in place on Kitchen's Overview | 05 Nov | Other |  |  | yes |  |  | 1280 |
| #546 The shared kitchen tablet can show today's prep as a wall board, one column per section | 05 Nov | Prep | yes | yes | yes |  |  | 390, 768, 1280 |
| #545 Kitchen opens on an Overview of every kitchen setting, each row saying what it is set to | 05 Nov | Other |  |  |  |  |  |  |
| #544 A person's page lists their saved assessments, and opens Assessments on them | 05 Nov | Admin and chef panel |  |  |  |  |  |  |
| #543 Chefs see today's order requests under each supplier's cut-off | 05 Nov | Orders, Suppliers and cut-offs |  |  | yes |  |  | 1280 |
| #542 Each person in Team has a page with their role, what they may do and their activity | 05 Nov | Today's team | yes | yes | yes |  |  | 390, 800, 1280 |
| #541 I'm on it: the first tap on a prep line stamps who is on it, the second ticks it | 05 Nov | Prep |  |  | yes |  |  | 1280 |
| #540 One period for every report: 7, 14 or 30 days chosen on one carries to the others | 05 Nov | Admin and chef panel | yes |  | yes |  |  | 390, 1280 |
| #539 Every report's numbers are tiles like the Dashboard's, and Wastage shows them first | 05 Nov | Admin and chef panel, Wastage | yes |  | yes |  |  | 390, 1280 |
| #538 A supplier's order is ticked on the order list only; the bar, Chef to-do and supplier p... | 05 Nov | Chef to-do, Orders, Suppliers and cut-offs |  |  |  |  |  |  |
| #536 Order requests can say Running low or Out now, and Out goes to the top for chefs | 05 Nov | Orders |  |  | yes |  |  | 1280 |
| #535 Today opens on a To do list, with kitchen mail ticked off in place | 05 Nov | Admin and chef panel, Mail |  |  |  |  |  |  |
| #534 Every list shows who and when on a small second line under each item | 05 Nov | Other | yes |  | yes |  |  | 390, 1280 |
| #533 The admin panel has four rooms: Today, Reports, Team and Kitchen | 05 Nov | Admin and chef panel, Today's team |  |  |  |  |  |  |
| #532 Admin page tabs are one underlined row, and long help folds under a link | 04 Nov | Admin and chef panel, Top bar and tabs | yes |  | yes |  |  | 390, 1280 |
| #531 The book takes up a new version when opened twice quickly, and the No signal band can b... | 05 Nov | Other | yes | yes | yes |  |  | 390, 768, 1280 |
| #530 Admin search boxes, dropdowns and Export buttons are one size on every page | 04 Nov | Admin and chef panel, Shared controls and sheets | yes |  | yes |  |  | 390, 1280 |
| #527 A role picked while the admin page redraws is kept, not lost | 04 Nov | Admin and chef panel |  |  |  |  |  |  |
| #526 The device question stays closed after View recipes for now, and its click test no long... | 04 Nov | Recipes |  |  |  |  |  |  |
| #525 Wastage and Transfers lines get the ⋯ with Change amount and Remove | 04 Nov | Transfers, Wastage |  |  | yes |  |  | 1280 |
| #520 Add food starts with the recipe, and the studio's tools are tiles you can tell are buttons | 04 Nov | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #519 Prep and Orders take the unit with one tap: unit chips under the amount, as drawn | 04 Nov | Orders, Prep | yes |  | yes |  |  | 390, 1280 |
| #517 The chef hat's tiles say what is next: Today 18:30 on Functions, PFD 15:00 on Supplier... | 04 Nov | Admin and chef panel, Functions, Suppliers and cut-offs | yes |  | yes |  |  | 390, 1280 |
| #515 The add button sits where the agreed design drew it: docked above the tab bar on every... | 04 Nov | Top bar and tabs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #514 The drawing studio is quiet: one bar at the thumb, and nothing over the food | 04 Nov | Recipe editor and drawings | yes |  | yes |  |  | 390, 1280 |
| #512 The book keeps only the 39 celebrations the calendar can show, and starts lighter | 04 Nov | Seasonal |  |  |  |  |  |  |
| #511 Plates, bowls and boards come in many more colours, and the Plate panel shows them as p... | 04 Nov | Recipe editor and drawings |  |  |  |  |  |  |
| #510 Recipes answers the tap at once and fills in the groups below just after (loading and f... | 04 Nov | Recipes | yes |  | yes |  |  | 390, 1280 |
| #508 Five celebration stamps redrawn after the cultural review: Nyepi, Galungan, Kuningan, S... | 04 Nov | Seasonal |  |  |  |  |  |  |
| #507 Dashboard watch list: pin a section, wasted item or person and follow its trend | 04 Nov | Admin and chef panel, Sign in and lock |  |  |  |  |  |  |
| #506 Needs you counts item links and training to review, the Review desk's way | 04 Nov | Admin and chef panel |  |  |  |  |  |  |
| #505 Orders opens on one list: today, then Waiting from earlier days, with Add a line as a s... | 04 Nov | Orders, Shared controls and sheets |  |  |  |  |  |  |
| #504 Prep opens on the list: Add a line as a sheet, Start here numbered on the lines | 04 Nov | Prep, Shared controls and sheets | yes |  |  |  |  | 390 |
| #502 No signal and updates slide over the page instead of pushing it down, and say All sent... | 04 Nov | Other | yes | yes | yes |  |  | 390, 768, 1280 |
| #501 The Save button says Saving, Saved or Try again, and errors are red (loading and feedba... | 04 Nov | Other |  |  |  |  |  |  |
| #500 Supplier order opens on the list on a phone | 04 Nov | Suppliers and cut-offs | yes |  |  |  |  | 360, 390 |
| #499 Drawings open full screen in a studio, with one dock and the picked part's buttons righ... | 04 Nov | Recipe editor and drawings |  |  |  |  | yes |  |
| #498 The recipe form opens in chapters with ingredient rows you type in, drawings as picture... | 04 Nov | Recipe editor and drawings, Recipes | yes |  |  |  | yes | 390 |
| #496 A waiting icon starts moving again when the signal comes back | 04 Nov | Deliveries, Functions, Recipe editor and drawings, Suppliers and cut-offs |  |  |  |  |  |  |
| #494 One celebration for everyone from the calendar, with Coming up, day counts and quiet days | 04 Nov | Seasonal |  |  |  |  |  |  |
| #491 Dashboard shows the week ahead: functions, cut-offs and the usual busy days | 04 Nov | Admin and chef panel, Functions, Suppliers and cut-offs | yes |  | yes |  | yes | 390, 1280 |
| #490 Work pages keep Kitchen Book and the chef hat, with a celebration stamp and a still fes... | 04 Nov | Admin and chef panel, Seasonal | yes | yes | yes |  |  | 390, 768, 1280 |
| #488 Celebrations stay off the words on Home, settle after a short arrival, and the chef hat... | 04 Nov | Admin and chef panel, Home, Seasonal | yes |  | yes |  |  | 390, 1280 |
| #484 Celebrations stay light on slow phones: the glow moves only opacity | 04 Nov | Seasonal |  |  |  |  |  |  |
| #483 Supplier order is one list with category jumps, and typing stays quick | 04 Nov | Suppliers and cut-offs |  |  |  |  |  |  |
| #482 Transfers open on Still out, with how long each has been out, and a whole pick-up in on... | 04 Nov | Transfers | yes |  | yes |  |  | 390, 1280 |
| #480 Usual amount chips on the order list add the line in one tap | 04 Nov | Orders |  |  |  |  |  |  |
| #479 Fix a line's amount or section from its ⋯ menu, with Undo | 04 Nov | Other |  |  |  |  |  |  |
| #478 Search boxes lose the empty gap under them | 04 Nov | Shared controls and sheets | yes | yes | yes |  |  | 390, 768, 1280 |
| #477 Dashboard says what needs you: mail, minutes, actions, transfers and the nightly run | 04 Nov | Admin and chef panel, Mail, Minutes, Transfers | yes |  | yes |  |  | 390, 1280 |
| #475 One ping sound for the whole kitchen, and a slow phone still rings | 04 Nov | Pings |  |  |  |  |  |  |
| #473 Sections are one tap: chips under the section box on Prep and Wastage | 04 Nov | Prep, Wastage | yes | yes | yes |  |  | 390, 768, 1280 |
| #472 Cooking words like sear, seal and poach are no longer spell-corrected | 04 Nov | Other | yes |  | yes |  |  | 390, 1280 |
| #471 Settings is sorted by who it is for: your card, You, This phone, Notifications, Team, T... | 04 Nov | Settings, Today's team | yes |  |  |  |  | 390 |
| #469 Toasts become one solid slip, errors stay, and an Undo never ticks a line by mistake (l... | 04 Nov | Other |  |  |  |  |  |  |
| #468 Pings ring when they pop up, and the head chef picks the sound | 04 Nov | Pings |  |  |  |  |  |  |
| #466 Admin panel opens on a Dashboard with headlines, tiles and charts | 04 Nov | Admin and chef panel | yes | yes | yes |  | yes | 390, 768, 1280 |
| #465 Delivery received asks what came in, supplier orders count and order on one row (design A) | 04 Nov | Deliveries, Orders, Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #464 The chef hat menu comes up from the bottom and the Writing as row goes (work pages rede... | 04 Nov | Admin and chef panel | yes | yes |  |  |  | 390, 768 |
| #461 Give celebration explanations more room for their text | 03 Nov | Seasonal | yes | yes | yes |  |  | 320, 390, 768, 1280 |
| #460 Keep celebration explanations compact | 03 Nov | Seasonal | yes |  |  |  |  | 390 |
| #459 Show kitchen waits and saves with Ink in motion | 03 Nov | Deliveries, Functions, Recipe editor and drawings, Suppliers and cut-offs |  |  |  |  |  |  |
| #458 Show drinks size and mail priority directly when they fit | 03 Nov | Drinks, Mail | yes | yes | yes |  |  | 320, 390, 768, 1280 |
| #457 Add seasonal celebrations to Home and the top bar | 03 Nov | Home, Recipe editor and drawings, Seasonal, Top bar and tabs |  |  |  |  | yes |  |
| #456 Show unit chips and fitting two-way choices directly | 03 Nov | Other | yes | yes | yes |  |  | 320, 390, 568, 768, 1280 |
| #453 Apply the owner's saved staff task permissions consistently | 02 Nov | Functions |  |  |  |  |  |  |
| #452 Keep the saved book complete when updates fail | 02 Nov | Other | yes |  |  |  |  | 360 |
| #451 Keep unfinished work safe during saved-copy repair | 02 Nov | Other |  |  |  |  |  |  |
| #449 Make warning and status text easier to read | 02 Nov | Other |  |  |  |  |  |  |
| #448 Keep narrow Prep task names and quantities readable | 02 Nov | Prep | yes |  |  |  | yes | 320, 390, 568 |
| #447 Keep delivery corrections focused on the right field | 02 Nov | Deliveries | yes | yes | yes |  |  | 390, 768, 1280 |
| #443 Keep report text and columns intact in CSV downloads | 02 Nov | Admin and chef panel |  |  |  |  |  |  |
| #440 Make pickers and searches clearer and easier to use | 02 Nov | Admin and chef panel, Recipe editor and drawings, Shared controls and sheets, Suppliers and cut-offs | yes | yes | yes |  | yes | 390, 768, 1280 |
| #435 Remember personal devices and make updates one tap | 02 Nov | Deliveries, Functions, Recipe editor and drawings, Suppliers and cut-offs |  |  |  |  | yes |  |
| #433 Unify choices, search and admin table controls | 02 Nov | Admin and chef panel, Functions, Shared controls and sheets, Suppliers and cut-offs |  |  |  |  | yes |  |
| #431 Let the admin repair autocorrect and protect kitchen words | 01 Nov | Admin and chef panel | yes | yes | yes |  | yes | 360, 390, 768, 1280 |
| #429 Bring every admin page into the Kitchen Book style | 01 Nov | Admin and chef panel | yes | yes | yes |  | yes | 390, 768, 1024, 1280, 1440 |
| #428 Keep brie and known ingredient words intact when proofreading | 01 Nov | Other |  |  |  |  |  |  |
| #427 Review item links and training from one clear desk | 01 Nov | Admin and chef panel | yes | yes | yes |  | yes | 390, 768, 1280 |
| #426 Let chefs multiply recipe amounts before saving | 01 Nov | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #425 Make training opportunities clearer and keep item references available | 01 Nov | Admin and chef panel |  |  |  |  | yes |  |
| #424 Make kitchen evidence and training easier to manage | 01 Nov | Admin and chef panel | yes | yes | yes |  | yes | 390, 768, 1280 |
| #423 Show the included guides in the admin panel | 31 Oct | Admin and chef panel, Guides | yes | yes | yes |  |  | 390, 768, 1280 |
| #418 Add smoke menu prep and setup sheets to Guides | 31 Oct | Guides, Prep, Shared controls and sheets | yes | yes | yes |  |  | 390, 768, 1280 |
| #417 Add the 2-hour / 4-hour food safety guide for everyone | 31 Oct | Guides | yes | yes | yes |  | yes | 390, 768, 1280 |
| #414 Nothing typed is lost without asking, an unchanged Save saves nothing, and a hand-over... | 30 Oct | Deliveries, Functions, Recipe editor and drawings, Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #411 With no signal the book says so everywhere, the tool pages still open, and an update ne... | 29 Oct | Functions, Recipe editor and drawings |  |  |  |  |  |  |
| #410 Tests only: every sign-in's pages and every database call are checked against the rules | 28 Oct | Functions, Sign in and lock | yes | yes | yes |  |  | 390, 768, 1280 |
| #409 A wastage line typed after midnight goes on today's list, and a word like "constructor"... | 28 Oct | Wastage |  |  |  |  |  |  |
| #405 With no signal the book says to keep it open, marks what is not sent, and never reloads... | 28 Oct | Other | yes |  |  |  |  | 360 |
| #403 Recipes get a Specials section, and the recipe form a Show and a Special switch | 28 Oct | Recipe editor and drawings, Recipes | yes |  |  |  |  | 390 |
| #401 Smoked Pulled Lamb Nachos and Buffalo BBQ Corn on the Cob in the book, with new drawings | 28 Oct | Recipe editor and drawings | yes |  | yes |  |  | 390, 1280 |
| #400 With no signal the book says so, instead of no names and empty lists | 28 Oct | Deliveries, Functions |  |  |  |  |  |  |
| #399 A cut-off with no catalogue supplier no longer opens another supplier's sheet | 28 Oct | Shared controls and sheets, Suppliers and cut-offs |  |  |  |  |  |  |
| #398 The head chef's Google device saves recipes, drawings and Sent ticks again after a sous... | 28 Oct | Recipes |  |  |  |  |  |  |
| #397 Staff can sign meeting minutes again | 27 Oct | Minutes |  |  |  |  |  |  |
| #396 An empty new drawing can no longer blank a recipe's plate | 27 Oct | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #395 Pick dates and times with the device calendar and clock | 26 Oct | Deliveries, Functions |  |  |  |  |  |  |
| #393 Record chilled and frozen deliveries from the chef-hat menu | 26 Oct | Deliveries | yes | yes | yes |  | yes | 390, 768, 1280 |
| #392 Send shift pings privately to one kitchen person | 26 Oct | Pings, Today's team |  |  |  |  |  |  |
| #390 Keep function actions inline and preserve scroll after closing sheets | 26 Oct | Functions, Shared controls and sheets | yes | yes | yes |  | yes | 390, 768, 1280 |
| #389 Cancel or delete functions directly from their list cards | 26 Oct | Functions | yes | yes | yes |  | yes | 390, 768, 1280 |
| #388 Give navigation and buttons warm press feedback | 26 Oct | Other |  |  |  |  | yes |  |
| #387 Keep recipes public and require personal login for kitchen operations | 26 Oct | Functions, Recipes |  |  |  |  |  |  |
| #386 Review wastage history by week, month or custom dates | 25 Oct | Wastage | yes | yes | yes |  | yes | 390, 768, 1280 |
| #385 One-click function cancellation and clear create/edit access | 25 Oct | Functions |  |  |  |  | yes |  |
| #384 Print function sheets and service run sheets for the team | 25 Oct | Functions, Shared controls and sheets, Today's team |  |  |  |  |  |  |
| #383 Keep numeric supplier quantities safe across catalogue changes | 25 Oct | Suppliers and cut-offs | yes |  |  |  |  | 390 |
| #382 Accept number-only supplier quantities without guessing units | 25 Oct | Suppliers and cut-offs |  |  |  |  |  |  |
| #381 Allow supplier order cut-offs up to two weeks before delivery | 25 Oct | Deliveries, Suppliers and cut-offs |  |  |  |  |  |  |
| #380 Keep transfers visible until stock is returned | 25 Oct | Transfers |  |  |  |  | yes |  |
| #379 Keep Back moving out of a task instead of reopening editors | 25 Oct | Functions, Recipe editor and drawings, Suppliers and cut-offs |  |  |  |  |  |  |
| #378 Confirm supplier orders without entering quantities | 25 Oct | Orders, Suppliers and cut-offs |  |  |  |  |  |  |
| #377 Keep Back compact in the header without losing unfinished work | 24 Oct | Functions, Recipe editor and drawings, Suppliers and cut-offs | yes |  |  |  | yes | 390 |
| #376 Add clear back actions and keep unfinished work when returning | 24 Oct | Functions, Recipe editor and drawings, Suppliers and cut-offs | yes | yes | yes |  |  | 390, 768, 1280 |
| #375 Keep staff Save presses working after editing a name | 24 Oct | Other |  |  |  |  |  |  |
| #374 Make supplier order quantities easier to review and save | 24 Oct | Suppliers and cut-offs | yes |  | yes |  |  | 390, 1280 |
| #373 Protect supplier cutoff completion during chef handover | 24 Oct | Suppliers and cut-offs |  |  |  |  |  |  |
| #372 Add private supplier ordering workspace and dated order history | 24 Oct | Suppliers and cut-offs |  |  |  |  | yes |  |
| #371 Bars at the top of the screen stay in their place when two strips are up | 24 Oct | Functions | yes | yes |  |  |  | 390, 720, 768 |
| #370 A shift ping is on screen for 30 minutes, then gone for everyone | 24 Oct | Minutes, Pings, Today's team |  |  |  |  |  |  |
| #369 Chefs get phone pushes before supplier cut-offs, only for orders nobody has ticked off | 24 Oct | Orders, Suppliers and cut-offs |  |  |  |  |  |  |
| #368 Cut-off reminders start 4 hours ahead, earlier per supplier if wanted | 23 Oct | Suppliers and cut-offs |  |  |  |  |  |  |
| #367 A transfer list for stock shared with the other venues: who came and took what, and wha... | 23 Oct | Transfers | yes |  |  |  |  | 320 |
| #366 The head chef and the sous chefs share a Chef to-do list | 23 Oct | Chef to-do |  |  |  |  |  |  |
| #365 Chefs get a reminder bar before each supplier's order cut-off | 23 Oct | Suppliers and cut-offs |  |  |  |  |  |  |
| #364 The head chef can let sous chefs read and tick off kitchen mail, off by default | 23 Oct | Mail |  |  |  |  |  |  |
| #363 Publishing minutes says what is happening: Publishing..., waiting for the signal, then... | 23 Oct | Minutes | yes |  |  |  |  | 390 |
| #362 Guides can be for everyone, chefs or function managers | 23 Oct | Functions, Guides |  |  |  |  |  |  |
| #361 Handing a phone over: Not you? does what Sign out does, a new starter is not stuck on O... | 23 Oct | Prep | yes |  | yes |  |  | 390, 1280 |
| #360 The prep, order and wastage lists start with the lines: fewer repeated cards and links... | 23 Oct | Prep, Wastage | yes | yes | yes |  |  | 390, 900, 1280 |
| #359 Admin pages say each thing once, and the how-to and README match the book | 23 Oct | Admin and chef panel | yes | yes | yes |  |  | 390, 768, 1280 |
| #358 Recipes and guides on a phone: the dish name first, the same links as Tiles, a guide se... | 23 Oct | Guides, Recipes, Shared controls and sheets | yes | yes | yes |  |  | 390, 430, 768, 1280 |
| #357 The Functions card on the landing page stops repeating the band, and the head chef sees... | 23 Oct | Functions |  |  |  |  |  |  |
| #356 Meeting minutes can start from the team notes, with headings | 23 Oct | Minutes, Today's team |  |  |  |  |  |  |
| #355 Sous chefs and the head chef get the shift pings too, their own included | 23 Oct | Pings, Today's team |  |  |  |  |  |  |
| #354 Pings and minutes to sign come up once when your shift starts, and the prep list is for... | 23 Oct | Minutes, Pings, Prep, Today's team |  | yes | yes |  | yes | 768, 1280 |
| #353 The chef hat menu is shorter: one line per item, nothing twice | 23 Oct | Admin and chef panel | yes |  |  |  |  | 390 |
| #352 "Not you?" next to "Writing as" on the order list and wastage too | 23 Oct | Orders, Wastage |  |  |  |  |  |  |
| #351 The rollover goes by when the team writes tomorrow's prep list, and Log waste comes up... | 22 Oct | Orders, Prep, Today's team |  |  |  |  |  |  |
| #350 Functions band: Hide and Show are a small round minus and plus | 22 Oct | Functions |  |  |  |  |  |  |
| #346 Shift pings can pop up at a set time of day, with no extra reads | 22 Oct | Pings, Today's team |  |  |  |  |  |  |
| #345 Functions band and sheet look like the rest of the book, with "2 × Pizza" and a fold | 22 Oct | Functions, Shared controls and sheets |  |  |  |  |  |  |
| #344 Only a phone's own sign-in can save: the old PIN proof is switched off (S8, phase 2) | 22 Oct | Sign in and lock |  |  |  |  |  |  |
| #342 Function contacts only for function managers, minutes drafts only for the head chef (S9) | 22 Oct | Functions, Minutes |  |  |  |  |  |  |
| #341 A personal PIN can no longer be guessed by script: one try every 20 seconds, and a sign... | 22 Oct | Sign in and lock |  |  |  |  |  |  |
| #337 A recipe, drawing or function save goes into the queue when the server is slow to answer | 22 Oct | Functions, Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #336 Practice on this device: trial lines are marked and the book does not learn from them | 22 Oct | Other |  |  |  |  |  |  |
| #335 Count whether the smart features are used, and how fast the book is on the phones | 22 Oct | Functions |  |  |  |  |  |  |
| #333 Ticking a line on a busy day answers in about a third of the time | 22 Oct | Other |  |  |  |  |  |  |
| #331 A first PIN can only be set while that person's set-up window is open | 22 Oct | Sign in and lock |  |  |  |  |  |  |
| #330 Phones read what the book learned as two nightly records instead of up to 800 | 22 Oct | Admin and chef panel |  | yes |  |  |  | 800 |
| #329 Handy shows what today's and tomorrow's function platters need, added up, with Add | 22 Oct | Functions |  |  |  |  |  |  |
| #328 The order list fills in an item's usual amount when the name is typed in full | 22 Oct | Orders |  |  |  |  |  |  |
| #327 Opening the book writes only changed files, and the 04:00 refresh only downloads what c... | 22 Oct | Other |  |  |  |  |  |  |
| #326 Chefs see what to check before the next functions: times TBC, changed or missing platte... | 22 Oct | Functions, Recipes |  |  |  |  |  |  |
| #325 The book counts 'Slice onion' and 'Slice onions' as one item, and '2 tubs' and '2tubs'... | 22 Oct | Other |  |  |  |  |  |  |
| #324 Option B folds: one jump button on the admin pages, the People how-to and the wastage a... | 22 Oct | Admin and chef panel, Wastage |  |  |  |  |  |  |
| #323 On a phone, Remove and who wrote a line sit behind a ⋯ on the line | 22 Oct | Other |  |  |  |  |  |  |
| #322 One set of look rules: orange main buttons everywhere, quiet Remove, a calmer admin bar | 22 Oct | Admin and chef panel |  |  |  |  |  |  |
| #320 The head chef's tools follow the chef lists, and Sign out on a shared tablet clears wha... | 22 Oct | Other |  |  |  |  |  |  |
| #319 Open prep rolls past a day with only function platters, and rolls once a day per phone | 22 Oct | Functions, Prep |  |  |  |  |  |  |
| #314 The admin Backup finishes even when one part is not allowed yet, and says what it left out | 22 Oct | Admin and chef panel |  |  |  |  |  |  |
| #313 The admin Backup works again, and the Lock probe gets past the locked Browser key | 22 Oct | Admin and chef panel, Sign in and lock |  |  |  |  |  |  |
| #312 Swap a part on a drawing, and the piece you swap in stays when the book draws the plate... | 22 Oct | Recipe editor and drawings |  |  |  |  |  |  |
| #311 The admin panel has fewer boxes: space and headings set the blocks apart | 22 Oct | Admin and chef panel |  |  |  |  |  |  |
| #310 Writing a topper card redraws its schnitzel, and parts drawn from a card stay where you... | 22 Oct | Recipe editor and drawings |  |  |  |  |  |  |
| #309 Wastage chips fill in the usual amount, and a box the book filled is selected on tap | 22 Oct | Wastage |  |  |  |  |  |  |
| #307 The plate drawings stay loaded at start (measured), and the recipe form picks up the sa... | 22 Oct | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #306 The chef hat menu dims the page, sideways tab rows fade at the edge, recipe links are f... | 22 Oct | Admin and chef panel, Recipe editor and drawings, Recipes, Top bar and tabs |  |  |  |  |  |  |
| #305 A damaged drawing can no longer add markup to the drawing editor, and the book loads on... | 22 Oct | Recipe editor and drawings |  |  |  |  |  |  |
| #303 A fix on a past day shows on every phone straight away, not tomorrow | 22 Oct | Other |  |  |  |  |  |  |
| #302 Service view: one screen with what goes out now across all functions | 22 Oct | Functions | yes | yes | yes |  |  | 390, 768, 1280 |
| #301 The first open of the day reads 655, not 775: the rollover reads only the day it rolls... | 22 Oct | Other |  |  |  |  |  |  |
| #300 Every recipe in the book is drawn with nothing left to pick | 22 Oct | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #299 A reload costs 17 reads, not 317: the learned list is read once a day, the admin report... | 22 Oct | Admin and chef panel |  |  |  |  |  |  |
| #298 Rolled prep lines say the day they were first written | 22 Oct | Prep |  |  |  |  |  |  |
| #297 Functions in the chef hat menu for all staff, read only | 22 Oct | Admin and chef panel, Functions |  |  |  |  |  |  |
| #296 Wastage is for logging: staff see today, past days are the head chef's in the admin panel | 22 Oct | Admin and chef panel, Wastage |  |  |  |  |  |  |
| #295 The function sheet leads with what goes out next; no guest count in the kitchen's views | 22 Oct | Functions, Shared controls and sheets |  |  |  |  |  |  |
| #294 Recipes draw themselves when saved, and dishes follow their components | 22 Oct | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #293 Function platters get their own tab on the prep list; up to 12 kinds of platter per fun... | 22 Oct | Functions, Prep, Top bar and tabs |  |  |  |  |  |  |
| #292 Burgers are drawn from their own layers, and batch recipes fill their own pan like the... | 22 Oct | Recipes |  |  |  |  |  |  |
| #291 Functions: order reminder the Sunday before, tomorrow in the band, a strip that stays o... | 22 Oct | Functions |  |  |  |  |  |  |
| #290 Tick each function round as sent; the band moves on to the next round | 22 Oct | Functions |  |  |  |  |  |  |
| #289 105 more single ingredients to draw, and each one cut and cooked the way the dish says | 22 Oct | Recipe editor and drawings |  |  |  |  |  |  |
| #288 Function platters go on the prep list for their day | 22 Oct | Functions, Prep |  |  |  |  |  |  |
| #287 Functions can be confirmed with the guests not known yet and the start time TBC | 22 Oct | Functions |  |  |  |  |  |  |
| #285 Functions: book a function once, the kitchen sees every platter and when it goes out | 22 Oct | Functions | yes | yes | yes |  | yes | 390, 768, 1280 |
| #284 Cowboy candy, the slaw and the sauces are drawn from their own recipe card | 22 Oct | Recipe editor and drawings, Recipes |  |  |  |  |  |  |
| #283 Reuse plates and grow the library | 21 Oct | Recipe editor and drawings | yes | yes | yes |  |  | 390, 768, 1280 |
| #282 The book draws the plate for you | 21 Oct | Recipe editor and drawings | yes |  |  |  |  | 390 |
| #281 Draw plates in the book | 21 Oct | Recipe editor and drawings | yes | yes | yes |  |  | 390, 768, 1280 |
| #280 Head chef can change and add recipes in the book | 21 Oct | Recipe editor and drawings, Recipes | yes | yes | yes |  |  | 390, 768, 1280 |
| #279 Recipes can change without a code change | 21 Oct | Recipes |  |  |  |  |  |  |
| #278 Admin nav: a redraw while scrolling down no longer keeps the nav open | 21 Oct | Admin and chef panel |  |  |  |  |  |  |
| #276 Smaller, see-through toasts and the update notice at the top | 21 Oct | Other | yes |  | yes |  |  | 390, 1280 |
| #275 Recipes opens faster and taps answer at once | 21 Oct | Recipes | yes |  | yes |  |  | 390, 1280 |
| #274 Download the Firebase files while the kitchen PIN is typed | 21 Oct | Sign in and lock |  |  |  |  |  |  |
| #273 Drinks run: add Espresso as a hot drink | 21 Oct | Drinks |  |  |  |  |  |  |
| #272 Frostier toasts and chef hat menu | 21 Oct | Admin and chef panel |  |  |  |  |  |  |
| #271 Open the book from the saved copy, fetch the newest behind it | 21 Oct | Other |  |  |  |  |  |  |
| #269 Admin nav that stays at the top, with On this page jumps | 21 Oct | Admin and chef panel | yes |  | yes |  |  | 390, 1280 |
| #268 Kitchen sections: pick your section after the PIN | 21 Oct | Sign in and lock |  |  |  |  |  |  |
| #266 Move Admin into the chef hat menu | 21 Oct | Admin and chef panel | yes |  | yes |  |  | 390, 1280 |
| #265 One look for type, frosted toasts and chef hat menu | 20 Oct | Admin and chef panel |  |  |  |  |  |  |
| #264 Drinks run: a compact list to read, ticked if on today | 20 Oct | Drinks | yes |  |  |  |  | 390 |
| #263 Minutes: hidden from staff until published, notebook look | 20 Oct | Minutes |  |  |  |  |  |  |
| #262 Shared tablet: the head chef's tools only while a chef is signed in | 20 Oct | Other |  |  |  |  |  |  |
| #261 Chef hat menu: Handy tools move there, Sign out replaces Prep list, pings for chefs onl... | 20 Oct | Admin and chef panel, Pings, Prep | yes | yes | yes |  |  | 390, 768, 1280 |
| #260 Settings in the chef hat menu for everyone | 20 Oct | Admin and chef panel, Settings |  |  |  |  |  |  |
| #259 Security header: scripts, fonts, data and frames only from this site and the services t... | 20 Oct | Other |  |  |  |  |  |  |
| #258 Drinks run: shorter on a phone, who is in today by themselves | 20 Oct | Drinks | yes |  |  |  |  | 390 |
| #257 JS tidy-up: one printWith() for every print, one trapTab() for every popup (usability U16) | 20 Oct | Other |  |  |  |  |  |  |
| #256 Drinks run: pick a soft drink or water with your usual | 20 Oct | Drinks |  |  |  |  |  |  |
| #255 Contrast and tap targets: a darker faint grey, 44 px admin fields, 28 px ticks (usabili... | 20 Oct | Admin and chef panel |  |  |  |  |  |  |
| #254 Insights first screen and the PIN move: one Export menu, Updated time, PIN typed twice... | 20 Oct | Sign in and lock |  |  |  |  |  |  |
| #253 Screen readers and keyboards: toasts from one live region, quiet counts, focus kept aft... | 20 Oct | Other |  |  |  |  |  |  |
| #252 Admin in five groups: Today, Reports, People, Content, Settings (usability U13b) | 20 Oct | Admin and chef panel, Settings |  |  |  |  |  |  |
| #249 Charts on a phone: drawn at the phone's width, a tap on a bar shows its numbers (usabil... | 20 Oct | Other |  | yes |  |  |  | 720 |
| #248 Drinks run: lock in your usual coffee after your first PIN, and share the team's order | 20 Oct | Drinks, Sign in and lock, Today's team |  |  |  |  |  |  |
| #247 People: Stopped working here with Put back, an unsaved count on Save, Undo and Sign out... | 20 Oct | Other |  |  |  |  |  |  |
| #246 One look: Wastage everywhere, orange main buttons, the admin PIN screen says where it g... | 20 Oct | Admin and chef panel, Sign in and lock, Wastage |  |  |  |  |  |  |
| #245 Readability: amounts in bold ink, bigger allergen text, a slim phone top bar (usability... | 20 Oct | Recipes, Top bar and tabs | yes |  | yes |  |  | 390, 1100 |
| #244 Recipes: Free from on the Pass with one allergen row, a count that follows the filters,... | 20 Oct | Recipes, Shared controls and sheets |  |  |  |  |  |  |
| #243 Prep list: a tap on the words ticks, a bigger box, Add 2 tubs in one tap, unsent lines... | 20 Oct | Prep |  |  |  |  |  |  |
| #242 Settings: Opens with shows a computer and a phone preview of The Pass and Tiles | 20 Oct | Settings | yes |  | yes |  |  | 390, 1280 |
| #241 Wastage: the form sits at the top, above the day's entries (usability U9c) | 20 Oct | Wastage | yes |  |  |  |  | 390 |
| #240 Head chef PIN shows Admin in the top bar, one tap from the Google sign-in | 20 Oct | Admin and chef panel, Sign in and lock, Top bar and tabs |  |  |  |  | yes |  |
| #239 Prep list first screen on a phone: Start here in one line, a Done today button, Quick a... | 20 Oct | Prep | yes |  |  |  |  | 390 |
| #238 Phone first screen: recipe name and allergens first, five dockets on one screen, Settin... | 20 Oct | Recipes, Settings |  |  |  |  |  |  |
| #237 Back button and guide pages: Back closes the big page and the pings popup, swipe turns... | 20 Oct | Guides, Pings, Shared controls and sheets |  |  |  |  |  |  |
| #236 Lists: share or copy what is left, copy the order for the supplier, and print each list... | 20 Oct | Suppliers and cut-offs |  |  |  |  |  |  |
| #235 Undo: a new toast never wipes an Undo still showing, Urgent can be undone, removed ping... | 20 Oct | Minutes, Pings |  |  |  |  |  |  |
| #234 Wastage and orders: a big amount asks once, suggestions fill what is usual, Next moves... | 20 Oct | Orders, Wastage |  |  |  |  |  |  |
| #233 Prep pages: a broken offline copy heals itself instead of hanging with no names | 20 Oct | Prep |  |  |  |  |  |  |
| #232 Minutes and pings: Read and sign opens the right minutes, one tap to sign, your actions... | 20 Oct | Minutes, Pings |  |  |  |  |  |  |
| #231 Head chef role: your own name always has every permission, and a sous chef cannot chang... | 20 Oct | Other |  |  |  |  |  |  |
| #230 Layout: nothing under the phone tab bar, the skip link keeps the page, every admin tab... | 20 Oct | Admin and chef panel, Top bar and tabs |  | yes | yes |  |  | 768, 1280 |
| #229 Shared kitchen tablets: the lists stay open after the lock and a tap asks who you are,... | 20 Oct | Sign in and lock |  |  |  |  |  |  |
| #227 Kitchen mail: staff write to Chef, the head chef ticks it off in the admin Mail tab | 20 Oct | Admin and chef panel, Mail, Top bar and tabs | yes | yes | yes |  |  | 390, 768, 1280 |
| #226 Prep list: a section the book filled in is cleared after each line (usability U2) | 20 Oct | Prep |  |  |  |  |  |  |
| #225 Orders and wastage: a past day that cannot be read is never kept as an empty day (usabi... | 20 Oct | Orders, Wastage |  |  |  |  |  |  |
| #224 Settings: Clear all ticks and the device type only on the head chef's device | 20 Oct | Settings |  |  |  |  |  |  |
| #220 App Check: the book sends a Fraud Defense (reCAPTCHA Enterprise) token with every request | 20 Oct | Orders |  |  |  |  |  |  |
| #219 Admin: only the head chef can make a device forget the kitchen PIN | 20 Oct | Admin and chef panel, Sign in and lock |  |  |  |  |  |  |
| #218 Refused write: the message blames the rules when the PIN still holds, not the PIN | 20 Oct | Sign in and lock |  |  |  |  |  |  |
| #217 Install the app: show the card and steps on Windows and Mac computers | 20 Oct | Other |  |  |  |  |  |  |
| #213 Settings: a shared kitchen device asks who you are after 10 minutes and each day | 20 Oct | Minutes, Settings |  |  |  |  |  |  |
| #212 Admin key only on the head chef's signed-in device | 20 Oct | Admin and chef panel |  |  |  |  |  |  |
| #211 Top bar: a chef hat in a ring shows while a person is signed in, and flips in on sign-in | 20 Oct | Admin and chef panel, Sign in and lock, Top bar and tabs | yes | yes | yes |  | yes | 390, 768, 1280, 1440 |
| #209 PIN screens: the box takes the keyboard by itself, with the number pad | 20 Oct | Sign in and lock |  |  |  |  |  |  |
| #206 Toasts: Added, Ticked, Ordered and Logged no longer repeat the line | 20 Oct | Other |  |  |  |  |  |  |
| #203 Entrees: redraw and update (poutine, cob, wings, calamari, breads, chips) | 20 Oct | Other |  |  |  |  |  |  |
| #200 Top bar: the pills wrap at tablet width instead of pushing the buttons off the page | 19 Oct | Top bar and tabs |  | yes |  |  |  | 720, 768 |
| #199 Learned items: the phones listen to the 500 most used, not the whole collection | 19 Oct | Other |  |  |  |  |  |  |
| #198 Insights: the Person filter applies everywhere, and the Rolled over heatmap draws again | 19 Oct | Other |  |  |  |  |  |  |
| #197 Idle lock keeps an unsaved staff list | 19 Oct | Sign in and lock |  |  |  |  | yes |  |
| #196 PIN screen: say when the PIN cannot be checked for lack of signal | 19 Oct | Sign in and lock |  |  |  |  |  |  |
| #195 Guide editor: put back the class and the words the now rename changed | 19 Oct | Guides |  |  |  |  |  |  |
| #193 Shift pings keep their writer through a sous chef's edit | 19 Oct | Pings, Today's team |  |  |  |  |  |  |
| #192 Prep list: past days are for ticks and removals, lines are added on today only | 19 Oct | Prep |  |  |  |  |  |  |
| #191 Small fixes from the audit: owner probe on every prep page, lk.admin only for the owner... | 19 Oct | Admin and chef panel, Prep |  |  |  |  |  |  |
| #187 Config: the head chef's saves no longer store the Google email | 19 Oct | Other |  |  |  |  |  |  |
| #186 Prep and orders: tell staff who removes a wrong line and who ticks orders | 19 Oct | Orders, Prep |  |  |  |  |  |  |
| #184 Staff list: a save carries only its own changes onto the latest list | 19 Oct | Other |  |  |  |  |  |  |
| #183 Minutes: older minutes can still be signed, and a refused sign-off says why | 19 Oct | Minutes |  |  |  |  |  |  |
| #182 Rollover: a failed once-a-day job waits 5 minutes instead of retrying on every redraw | 19 Oct | Minutes |  |  |  |  |  |  |
| #181 Wastage, Last 7 days: today always counted, a removed past entry leaves at once | 19 Oct | Wastage |  |  |  |  |  |  |
| #178 Rules: only listed people set a PIN, and roles changed from the prep book wait for the... | 19 Oct | Prep, Sign in and lock |  |  |  |  |  |  |
| #176 New pages: hold Guides, Shift pings and Minutes back from staff | 19 Oct | Guides, Minutes, Pings, Today's team |  |  |  |  |  |  |
| #175 Prep list: double ups across sections merge into one line | 19 Oct | Prep |  |  |  |  |  |  |
| #174 Rename notes to Shift pings, and a Pings tick per person | 19 Oct | Pings, Today's team |  |  |  |  |  |  |
| #173 Nightly learning on the server: a GitHub Action counts each finished day | 19 Oct | Other |  |  |  |  |  |  |
| #172 Handy page: drop what the list already shows, one Quick add row | 19 Oct | Other | yes |  | yes |  | yes | 390, 1280 |
| #171 Minutes to sign: a card on the landing page, not a second bell in the top bar | 19 Oct | Minutes, Top bar and tabs | yes | yes | yes |  |  | 390, 768, 1280 |
| #170 Backup includes notes, minutes and what the order list learned | 19 Oct | Minutes, Orders |  |  |  |  |  |  |
| #169 One clock: the server's time in kitchen time, and origAt on rolled lines | 19 Oct | Other |  |  |  |  |  |  |
| #168 Add Guides: how-to guides the head chef uploads for the team | 19 Oct | Guides, Today's team | yes | yes | yes |  | yes | 390, 768, 1280, 1440 |
| #166 Repair lines that rolled over before the written-for-tomorrow rule | 19 Oct | Other |  |  |  |  |  |  |
| #165 Recipe data and docs in step with the code | 19 Oct | Recipes |  |  |  |  |  |  |
| #164 Front end tidy: one top bar namespace, colour variables, 44 px targets, dead code out | 19 Oct | Top bar and tabs | yes | yes | yes |  |  | 390, 768, 1280 |
| #163 Keep reads small: cache past days for the day, no re-reads after a tick | 19 Oct | Other |  |  |  |  |  |  |
| #162 Order list: nudge about lines waiting more than 3 days, and learn what is ordered | 19 Oct | Orders |  |  |  |  |  |  |
| #161 Lines written after close count for the next day, not as rolled | 19 Oct | Other |  |  |  |  |  |  |
| #160 Roll order lines over until they are ordered, like prep lines | 19 Oct | Prep |  |  |  |  |  |  |
| #159 Make the safety nets and write errors work the same way everywhere | 19 Oct | Other |  |  |  |  |  |  |
| #158 Fix the bugs found in the consistency audit | 19 Oct | Other |  |  |  |  |  |  |
| #156 Recipe search that forgives typos and understands gluten free, plus jumps on the recipe... | 18 Oct | Recipes, Shared controls and sheets | yes | yes | yes |  |  | 390, 900, 1280 |
| #155 Full-size buttons on every line, lists that do not jump, and a confirmation for every a... | 18 Oct | Other | yes |  | yes |  | yes | 390, 1280 |
| #154 Show when changes have not been sent, and never lose typed text | 18 Oct | Other | yes |  | yes |  |  | 390, 1280 |
| #153 Undo on every remove and a second tap for anything hard to take back | 18 Oct | Other | yes |  | yes |  |  | 390, 1280 |
| #152 Admin: better layout for lists that can grow | 18 Oct | Admin and chef panel | yes |  | yes |  | yes | 390, 1280 |
| #151 Minutes: writing first, attendance folded, shorter register | 18 Oct | Minutes | yes |  | yes |  |  | 390, 1280 |
| #150 Notes: keep the text box in view on phones | 18 Oct | Other |  |  |  |  |  |  |
| #149 Notes: list first, preview, scheduling, undoable days, seen count | 18 Oct | Other | yes |  | yes |  | yes | 390, 1280 |
| #148 Order list: add box on top, two columns on desktop | 18 Oct | Orders | yes | yes | yes |  | yes | 390, 1000, 1280 |
| #147 Order list: ordered lines move to Ordered today after 10 minutes | 18 Oct | Minutes, Orders | yes |  | yes |  |  | 390, 1280 |
| #146 Prep list: recipe picker floats instead of pushing the list | 18 Oct | Prep, Recipes, Shared controls and sheets | yes |  | yes |  |  | 390, 1280 |
| #145 Automatic updates for open apps | 18 Oct | Other |  |  |  |  |  |  |
| #144 Prep list: ticked lines leave the list, shown in Done today | 18 Oct | Prep | yes |  | yes |  |  | 390, 1280 |
| #143 Kitchen meeting minutes with sign-off register | 18 Oct | Minutes | yes |  | yes |  |  | 390, 1280 |
| #142 Pass search shows only matches | 18 Oct | Shared controls and sheets |  |  |  |  |  |  |
| #139 Proofreader fixes and auto-confirm PINs | 18 Oct | Other |  |  |  |  |  |  |
| #136 Desktop idle lock: own PIN after 7.5 minutes | 18 Oct | Minutes, Sign in and lock |  |  |  |  |  |  |
| #135 Readable plate labels and cowboy candy on the wings | 18 Oct | Other | yes |  | yes |  | yes | 390, 1280 |
| #128 Fix installing the book as an app on Android and iPhone | 18 Oct | Other | yes |  | yes |  |  | 390, 1280 |
| #126 Prep list: show more lines on big screens | 18 Oct | Prep | yes | yes | yes | yes |  | 390, 720, 768, 900, 1024, 1366, 1920 |
| #125 Wastage and Orders pages grow with their content on big screens | 18 Oct | Orders, Wastage | yes | yes |  |  |  | 390, 900 |
| #124 Add daily notes: popup after 10:30, bell, and a Notes editor | 18 Oct | Other | yes | yes | yes |  |  | 360, 390, 768, 1280 |
| #123 Declutter chips on phones | 18 Oct | Other | yes |  | yes |  | yes | 390, 1280 |
| #122 Chalk KB logo across the board | 18 Oct | Other | yes |  | yes |  |  | 360, 1280 |
| #118 Make the book installable | 18 Oct | Other |  |  |  |  |  |  |
| #117 QR code in Settings (desktop only) | 18 Oct | Settings |  |  |  |  |  |  |
| #116 Spell-check section names | 18 Oct | Other |  |  |  |  |  |  |
| #115 Insights restructure, print or save as PDF, CSV export | 18 Oct | Other |  |  |  |  |  |  |
| #114 Consistent top bar, no loading flash, admin filters and heatmaps | 18 Oct | Admin and chef panel, Top bar and tabs |  |  |  |  |  |  |
| #113 Admin key top right on every page, no Home button | 18 Oct | Admin and chef panel, Home |  |  |  |  |  |  |
| #112 Admin on every page, wastage overview, more suggestions | 18 Oct | Admin and chef panel, Wastage |  |  |  |  |  |  |
| #111 Wastage log, empty searches, deeper insights and staff suggestions | 18 Oct | Shared controls and sheets, Wastage |  |  |  |  |  |  |
| #110 Ticked prep lines stay ticked, Done today checklist, back keeps scroll | 18 Oct | Prep |  |  |  |  |  |  |
| #109 Pass by default, List removed, view switch, drawn dish on tiles | 18 Oct | Other |  |  |  |  |  |  |
| #108 Landing page with docket buttons and shared navigation | 18 Oct | Other |  |  |  |  | yes |  |
| #107 Team tab and order list permissions | 18 Oct | Orders, Today's team, Top bar and tabs |  |  |  |  |  |  |
| #106 Order list | 18 Oct | Orders |  |  |  |  |  |  |
| #105 People tab as a table | 18 Oct | Top bar and tabs |  |  |  |  |  |  |
| #104 Admin panel tabs and staff list tidy-ups | 18 Oct | Admin and chef panel, Top bar and tabs |  |  |  |  | yes |  |
| #103 Staff see only today | 18 Oct | Other |  |  |  |  |  |  |
| #102 Drawn 4-digit PIN boxes, numbers only | 18 Oct | Sign in and lock |  |  |  |  |  |  |
| #101 Personal PIN back to 4 digits, wait after 3 wrong tries | 18 Oct | Sign in and lock |  |  |  |  |  |  |
| #100 Staff lock: writes need a person's own 6-digit PIN | 18 Oct | Sign in and lock |  |  |  |  |  |  |
| #99 Owner tool: move to a new 6 digit kitchen PIN | 18 Oct | Sign in and lock |  |  |  |  |  |  |
| #98 Hardening: backup, owner check, App Check hook, rules template | 18 Oct | Other |  |  |  |  |  |  |
| #97 Automatic 90 day progressive learning | 18 Oct | Other |  |  |  |  |  |  |
| #96 Proofread new prep lines | 18 Oct | Prep |  |  |  |  |  |  |
| #95 Smart prep list: learned items and suggestions | 18 Oct | Prep |  |  |  |  |  |  |
| #94 Rollover, sous chef by PIN, urgent flag, handy page | 17 Oct | Sign in and lock |  |  |  |  |  |  |
| #93 Admin levels, insights charts, weekly badges, recipe recognition | 17 Oct | Admin and chef panel, Recipes |  |  |  |  |  |  |
| #92 Prep book: notebook layout, sections, personal PINs, admin tallies | 17 Oct | Admin and chef panel, Prep |  |  |  |  |  |  |
| #91 Admin sign-in: show error code, redirect fallback | 17 Oct | Admin and chef panel, Sign in and lock |  |  |  |  |  |  |
| #90 Live prep list and admin panel | 17 Oct | Admin and chef panel, Prep |  |  |  |  |  |  |
| #83 List view: type chips with Functions | 17 Oct | Functions |  |  |  |  |  |  |
| #82 The Pass: type chips with Functions | 17 Oct | Functions |  |  |  |  |  |  |
| #78 Functions platters | 17 Oct | Functions |  |  |  |  |  |  |
| #72 Green frame for finished cards | 16 Oct | Other |  |  |  |  |  |  |
| #69 Daily self-refresh | 16 Oct | Other |  |  |  |  |  |  |
| #60 Group the recipe book like the guest menu | 15 Oct | Recipes |  |  |  |  |  |  |
| #12 Swipeable chip rows | 14 Oct | Shared controls and sheets | yes |  | yes |  |  | 390, 1280 |
| #8 Online-menu dishes, snacks and side views | 14 Oct | Other | yes |  | yes |  |  | 390, 1280 |
| #7 Exploded build views; smash burger build | 13 Oct | Other |  |  |  |  |  |  |
| #6 Batch recipe cards show their pan picture | 13 Oct | Recipes |  |  |  |  |  |  |
| #3 Menu details: toppers, sauces and what's on each plate | 13 Oct | Other |  |  |  |  |  |  |
| #2 Plating pictures for every Spring 26 dish | 13 Oct | Other |  |  |  |  |  |  |
| #1 Add the Spring 26 AVC dishes to the recipe book | 13 Oct | Recipes |  |  |  |  |  |  |
