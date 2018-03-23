package wst

import (
	"log"
	"net/http"
	"html/template"
)

type User struct {
	UserName string
}

type adminController struct {

}

func (this *adminController)IndexAction(w http.ResponseWriter, r *http.Request, user string) {
	t, err := template.ParseFiles("static/html/admin/index.html")
	if err != nil {
		log.Println(err)
	}
	t.Execute(w, &User{user})
	log.Println("adminController-->IndexAction")
}