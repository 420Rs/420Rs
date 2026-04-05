import sys
import uuid
import requests
import datetime
from PyQt6.QtWidgets import (QApplication, QWidget, QVBoxLayout, 
                             QLabel, QLineEdit, QTextEdit, QComboBox, QPushButton, QMessageBox)

# MockAPI Endpoint
API_URL = "https://69d225325043d95be9717fa0.mockapi.io/420Rs"

class UploaderApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("420RS - Siêu Tốc Upload (MockAPI)")
        self.resize(400, 500)
        
        layout = QVBoxLayout()
        
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Tên tài nguyên...")
        layout.addWidget(QLabel("Tên tài nguyên:"))
        layout.addWidget(self.name_input)
        
        self.cat_select = QComboBox()
        cats = {"image": "Images", "document": "Docs", "code": "Code", "video": "Video", "tool": "Tools", "other": "Other"}
        for k, v in cats.items():
            self.cat_select.addItem(v, k)
        layout.addWidget(QLabel("Danh mục:"))
        layout.addWidget(self.cat_select)
        
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("https://...")
        layout.addWidget(QLabel("Link download / Xem:"))
        layout.addWidget(self.url_input)
        
        self.thumb_input = QLineEdit()
        self.thumb_input.setPlaceholderText("Link ảnh bìa (hoặc để trống)")
        layout.addWidget(QLabel("Thumbnail URL:"))
        layout.addWidget(self.thumb_input)

        self.desc_input = QTextEdit()
        self.desc_input.setPlaceholderText("Mô tả vài dòng...")
        self.desc_input.setFixedHeight(80)
        layout.addWidget(QLabel("Mô tả:"))
        layout.addWidget(self.desc_input)
        
        self.tags_input = QLineEdit()
        self.tags_input.setPlaceholderText("ví dụ: psd, 3d, free")
        layout.addWidget(QLabel("Tags (cách nhau dấu phẩy):"))
        layout.addWidget(self.tags_input)
        
        self.submit_btn = QPushButton("🚀 BẤN THẲNG LÊN WEB")
        self.submit_btn.setFixedHeight(50)
        self.submit_btn.setStyleSheet("background-color: #2563eb; color: white; font-weight: bold; font-size: 14px; border-radius: 8px;")
        self.submit_btn.clicked.connect(self.upload_data)
        layout.addWidget(self.submit_btn)
        
        self.setLayout(layout)

    def upload_data(self):
        name = self.name_input.text().strip()
        url = self.url_input.text().strip()
        if not name or not url:
            QMessageBox.warning(self, "Lỗi", "Tên và Link không được để trống!")
            return

        cat = self.cat_select.currentData()
        desc = self.desc_input.toPlainText().strip()
        thumb = self.thumb_input.text().strip()
        tags_raw = self.tags_input.text().strip()
        tags = [t.strip() for t in tags_raw.split(',')] if tags_raw else []

        doc_id = str(uuid.uuid4())[:12]
        now = datetime.datetime.utcnow().isoformat() + "Z"

        payload = {
            "id": doc_id,
            "name": name,
            "cat": cat,
            "desc": desc,
            "url": url,
            "thumb": thumb,
            "tags": tags,
            "dl": 0,
            "date": now
        }

        try:
            self.submit_btn.setText("Đang up...")
            self.submit_btn.setEnabled(False)
            
            res = requests.post(API_URL, json=payload)
            
            if res.status_code == 201:
                QMessageBox.information(self, "Thành công!", "Tài nguyên đã bay lên Web qua MockAPI!")
                self.name_input.clear()
                self.url_input.clear()
                self.desc_input.clear()
                self.thumb_input.clear()
                self.tags_input.clear()
            else:
                QMessageBox.critical(self, "Lỗi Server", f"Code: {res.status_code}\nLý do: {res.text}")
        except Exception as e:
            QMessageBox.critical(self, "Lỗi", str(e))
        finally:
            self.submit_btn.setText("🚀 BẤN THẲNG LÊN WEB")
            self.submit_btn.setEnabled(True)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = UploaderApp()
    window.show()
    sys.exit(app.exec())
