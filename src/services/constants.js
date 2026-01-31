const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const constants = {
    apiRoutes: {
        LOGIN_URL: `${API_BASE_URL}/locket/login`,
        UPLOAD_MEDIA_URL: `${API_BASE_URL}/locket/upload-media`,
    },
    toastSettings: {
        position: "bottom-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
    },
};

export default constants;
