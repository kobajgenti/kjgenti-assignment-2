# Makefile
.PHONY: install run

install:
	@echo "Installing Python dependencies..."
	python3 -m venv venv
	install -r requirements.txt
	@echo "Python dependencies installed."
	@echo "No additional frontend dependencies required."

run:
	@echo "Starting Flask backend..."
	python app.py