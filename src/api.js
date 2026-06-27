export const API_URL = import.meta.env.VITE_API_URL || "";


function getInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }

  return "user=%7B%22id%22%3A12345%2C%22first_name%22%3A%22Test%22%7D&hash=dev";
}


async function request(method, path, body) {

  const res = await fetch(`${API_URL}${path}`, {

    method,

    headers:{
      "Content-Type":"application/json",
      "x-init-data":getInitData(),
      "x-user-id":"placeholder"
    },

    body: body ? JSON.stringify(body) : undefined

  });


  if(!res.ok){
    throw new Error(`HTTP ${res.status}`);
  }


  return res.json();
}



export const api={


  getWorkouts:
    ()=>request("GET","/workouts"),


  saveWorkout:
    (w)=>request("POST","/workouts",w),


  deleteWorkout:
    (id)=>request("DELETE",`/workouts/${id}`),



  getMeasurements:
    ()=>request("GET","/measurements"),


  saveMeasurement:
    (m)=>request(
      "POST",
      "/measurements",
      {
        ...m,
        data:Object.fromEntries(
          Object.entries(m)
          .filter(([k])=>
            !["id","name","date"].includes(k)
            && m[k]!==""
            && m[k]!=null
          )
        )
      }
    ),


  deleteMeasurement:
    (id)=>request(
      "DELETE",
      `/measurements/${id}`
    ),



  renameExercise:
    (oldName,newName)=>
      request(
        "PATCH",
        "/exercises/rename",
        {
          old:oldName,
          new:newName
        }
      )

};