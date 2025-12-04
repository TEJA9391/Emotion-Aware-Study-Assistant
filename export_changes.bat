@echo off
REM Export all modified files from today's conversation

echo Creating backup of all changed files...

REM Create export directory
mkdir changed_files 2>nul

REM Copy all modified/created files
echo Copying main files...
copy app.py changed_files\
copy emotion_detector.py changed_files\
copy README.md changed_files\
copy static\js\script.js changed_files\script.js
copy templates\index.html changed_files\index.html
copy CHANGES_SUMMARY.md changed_files\
copy FILE_VERIFICATION.md changed_files\

REM Copy secondary files
echo Copying support files...
copy requirements.txt changed_files\
copy voice_analyzer.py changed_files\
copy study_recommendations.py changed_files\
copy templates\dashboard.html changed_files\dashboard.html
copy static\css\style.css changed_files\style.css
copy .gitignore changed_files\.gitignore

echo.
echo ===================================
echo All changed files exported to: changed_files\
echo ===================================
echo.
echo Main changes:
echo   - app.py (Backend with image processing)
echo   - emotion_detector.py (NEW - DeepFace integration)
echo   - script.js (Complete rewrite with browser media)
echo   - index.html (Added video/canvas elements)
echo   - README.md (NEW - Complete documentation)
echo.
echo To create ZIP archive, run:
echo   powershell Compress-Archive -Path changed_files\* -DestinationPath emotion-assistant-changes.zip
echo.
pause
